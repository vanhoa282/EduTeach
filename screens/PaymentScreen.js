import InvoiceManager from '../components/InvoiceManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentNotice from '../components/PaymentNotice';
import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, StyleSheet, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { getPaymentBank, checkPaymentNow } from '../lib/paymentGateway';
import { pickImage, uploadImage } from '../lib/upload';

const BANK_LABELS = {ACB:'ACB - Á Châu', MB:'MB Bank', VCB:'Vietcombank', BIDV:'BIDV'};
function newOrderCode() {
  const bytes = Crypto.getRandomBytes(4);
  const n = (((bytes[0]*256 + bytes[1])*256 + bytes[2])*256 + bytes[3]) >>> 0;
  return 'EDT' + String(100000 + n % 900000);
}
function fmt(n) {return Number(n || 0).toLocaleString('vi-VN') + 'đ';}

export default function PaymentScreen({user,tutor,booking,onBack,onSuccess}) {
  const [bank,setBank] = useState(null);
  const [bankError,setBankError] = useState('');
  const [order,setOrder] = useState(null);
  const [creating,setCreating] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [billUrl,setBillUrl] = useState('');
  const [timeLeft,setTimeLeft] = useState(1800);
  const [paid,setPaid] = useState(false);
  const [checkingNow,setCheckingNow] = useState(false);
  const checkNowRef = useRef(false);
  const [paymentCheckError,setPaymentCheckError] = useState('');
  const finished = useRef(false);
  const [notice, setNotice] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const showNotice = (title, message, type = 'info') => {
    const raw = String(message || '');

    let safe = raw;

    if (raw.includes('LIMIT_2_PENDING_INVOICES')) {
      safe = 'Bạn đang có 2 hóa đơn chờ thanh toán. Vui lòng vào Quản Lý Hóa Đơn để xử lý trước khi tạo mới.';
    } else if (raw.includes('INVOICE_NOT_PAYABLE')) {
      safe = 'Hóa đơn đã hết hạn hoặc không còn hiệu lực. Vui lòng tạo hóa đơn mới.';
    } else if (
      /Supabase|API5S|RPC|SQL|403|500|PGRST|permission denied|duplicate key|violates|date_only_no_time|network request failed/i.test(raw)
    ) {
      safe = 'Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại sau.';
    }

    setNotice({ title, message: safe, type });
  };

  useEffect(()=>{let mounted=true;(async()=>{
    const r=await getPaymentBank();
    if(!mounted)return;
    if(r.error)setBankError(r.error);
    else setBank(r.bank);
  })();return()=>{mounted=false;};},[]);

  // Tự kiểm tra ngay khi có đơn, mỗi 3 giây và khi quay lại ứng dụng.
  useEffect(() => {
    if (!order?.id || paid) return;
    let active = true;
    let busy = false;
    const checkPayment = async () => {
      if (!active || busy) return;
      busy = true;
      try {
        const { data, error } = await supabase.from('orders')
          .select('status').eq('id', order.id).maybeSingle();
        if (!active) return;
        if (error) setPaymentCheckError('Chưa thể cập nhật trạng thái thanh toán. Hệ thống sẽ tự thử lại.');
        else if (!data) setPaymentCheckError('Chưa thể cập nhật hóa đơn. Vui lòng chờ trong giây lát.');
        else {
          setPaymentCheckError('');
          if (data.status === 'paid') setPaid(true);
        }
      } catch (_) {
        // Lỗi mạng tạm thời: tiếp tục kiểm tra ở lần sau.
      } finally { busy = false; }
    };
    checkPayment();
    const timer = setInterval(checkPayment, 3000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') checkPayment();
    });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [order?.id, paid]);
  useEffect(()=>{
    if(!order?.id)return;
    const id=setInterval(()=>{
      setTimeLeft(Math.max(0,Math.floor((new Date(order.expires_at).getTime()-Date.now())/1000)));
    },1000);
    return()=>clearInterval(id);
  },[order?.id]);
  useEffect(() => {
    if (paid && order?.course_id && !finished.current) {
      finished.current = true;
      onSuccess({ id: order.course_id }); // Tự chuyển trang, không cần bấm OK.
    }
  }, [paid, order?.course_id, onSuccess]);

  const copy = async text=>{await Clipboard.setStringAsync(String(text));showNotice('Đã sao chép',String(text));};
  const createOrder = async()=>{
    if(!bank?.ready || !user?.id || !tutor?.id || creating)return;
    setCreating(true);
    let courseId=null;
    try {
      const {data:feeConfig,error:feeErr}=await supabase.from('settings').select('value').eq('key','commission_rate').maybeSingle();
      if(feeErr)throw feeErr;
      const rate=Number(feeConfig?.value??10);
      if(!Number.isFinite(rate)||rate<0||rate>50)throw new Error('Cấu hình hoa hồng không hợp lệ');
      const {data:course,error:courseErr}=await supabase.from('courses').insert({
        student_id:user.id,tutor_id:tutor.id,subject:tutor.subject,
        total_sessions:booking.sessions,price_per_session:tutor.price,total_price:booking.total,
        payment_type:booking.paymentType,paid_amount:0,commission_rate:rate,
        status:'pending_payment',schedule:booking.schedule,
      }).select('id').single();
      if(courseErr)throw courseErr;
      courseId=course.id;
      const secretBytes = Crypto.getRandomBytes(32);
      const secret = Array.from(secretBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const secretHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        secret
      );

      const code=newOrderCode();
      const expires=new Date(Date.now()+30*60*1000).toISOString();
      const {data:newOrder,error:orderErr}=await supabase.from('orders').insert({
        order_code:code,student_id:user.id,course_id:courseId,amount:booking.payNow,
        status:'pending',expires_at:expires,cancel_secret_hash:secretHash,
      }).select('id,order_code,course_id,amount,expires_at').single();
      if(orderErr)throw orderErr;
      await AsyncStorage.setItem(
        '@eduteach_invoice_secret_' + newOrder.id,
        secret
      );
      setOrder(newOrder);
    } catch(e) {
      showNotice('Chưa tạo được đơn',e?.message||'Lỗi hệ thống. Không chuyển tiền khi chưa có mã đơn.');
      // Orphan pending courses (if any) must be cleaned through controlled admin maintenance.
    } finally {setCreating(false);}
  };
  // Only a verified bank transaction can activate a course.
  const confirmPaymentNow = async () => {
    if (!order?.id || checkNowRef.current || finished.current || paid) return;
    checkNowRef.current = true;
    setCheckingNow(true);
    try {
      const result = await checkPaymentNow(order.id, order.order_code);
      if (result.status === 'paid') {
        setPaid(true); // Existing effect calls onSuccess and navigates immediately.
      } else if (result.status === 'not_paid') {
        showNotice('Giao Dịch Chưa Thanh Toán', 'Chưa tìm thấy giao dịch hợp lệ. Kiểm tra đúng số tiền và nội dung chuyển khoản, sau đó thử lại. Không chuyển tiền lần hai nếu ngân hàng đã trừ tiền.');
      } else if (result.status === 'rate_limited') {
        showNotice('Vui lòng chờ', 'Bạn vừa kiểm tra. Hãy chờ khoảng 8 giây rồi bấm lại.');
      } else {
        showNotice('Chưa thể kiểm tra thanh toán', result.message || 'Lỗi kết nối. Thử lại sau; không cần chuyển tiền lần nữa.');
      }
    } catch (_) {
      showNotice('Lỗi xác minh', 'Không kết nối được máy chủ. Thử lại sau; không cần chuyển tiền lần nữa.');
    } finally {
      checkNowRef.current = false;
      setCheckingNow(false);
    }
  };

  const uploadBill = async()=>{
    if(!order?.id||uploading)return;
    const r=await pickImage();
    if(r.cancelled)return;
    if(r.error)return showNotice('Lỗi',r.error);
    setUploading(true);
    try {
      const uploaded=await uploadImage({uri:r.uri,bucket:'bills',folder:order.order_code});
      if(uploaded.error)throw new Error(uploaded.error);
      const {error}=await supabase.from('orders').update({bill_url:uploaded.url}).eq('id',order.id).eq('status','pending');
      if(error)throw error;
      setBillUrl(uploaded.url);
      showNotice('Đã gửi bill','Bộ phận hỗ trợ sẽ kiểm tra nếu giao dịch chưa được xác nhận tự động.');
    } catch(e){showNotice('Lỗi upload',e.message||'Không gửi được bill');}
    finally {setUploading(false);}
  };
  const qr = order&&bank?`https://img.vietqr.io/image/${encodeURIComponent(bank.bank_code)}-${encodeURIComponent(bank.account_number)}-compact2.png?amount=${encodeURIComponent(String(order.amount))}&addInfo=${encodeURIComponent(order.order_code)}&accountName=${encodeURIComponent(bank.account_holder)}`:null;
  const goCourses =()=>onSuccess({id:order.course_id});
  if (invoiceOpen) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <InvoiceManager
          studentId={user?.id}
          onClose={() => setInvoiceOpen(false)}
          onNotice={showNotice}
        />
        <PaymentNotice
          visible={!!notice}
          title={notice?.title}
          message={notice?.message}
          type={notice?.type}
          onClose={() => setNotice(null)}
        />
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={s.root} edges={['top']}>
    <View style={s.top}><TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" color="#0F172A" size={24}/></TouchableOpacity>
      <Text style={s.title}>Thanh toán khóa học</Text><View style={{width:24}}/></View>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.priceBox}><Text style={s.priceTitle}>Số tiền cần thanh toán</Text><Text style={s.price}>{fmt(booking.payNow)}</Text>
        <Text style={s.light}>{booking.sessions} buổi · {tutor.name}</Text></View>
      {!order ? <View style={s.card}>
        <Text style={s.section}>Chuẩn bị thanh toán</Text>
        <Text style={s.tip}>Hãy tạo mã đơn trước, sau đó mới chuyển khoản. Nhập đúng mã đơn để hệ thống đối soát.</Text>
        {bank?<Text style={s.hint}>Ngân hàng: {BANK_LABELS[bank.bank_code]||bank.bank_code} · {bank.account_holder}</Text>:<Text style={s.error}>{bankError||'Đang tải thông tin ngân hàng...'}</Text>}
        <TouchableOpacity style={[s.button,(!bank||creating)&&s.disabled]} disabled={!bank||creating} onPress={createOrder}>
          {creating?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Tạo mã đơn và QR chuyển khoản</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: '#BFDBFE',
            backgroundColor: '#EFF6FF',
            borderRadius: 15,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
          onPress={() => setInvoiceOpen(true)}
        >
          <Ionicons
            name="receipt-outline"
            size={26}
            color="#2563EB"
          />

          <View style={{ flex: 1 }}>
            <Text style={{
              color: '#1D4ED8',
              fontSize: 16,
              fontWeight: '800',
            }}>
              Quản Lý Hóa Đơn
            </Text>
            <Text style={{
              color: '#64748B',
              fontSize: 12,
              marginTop: 4,
            }}>
              Tất cả hóa đơn · Mọi gia sư
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#2563EB"
          />
        </TouchableOpacity>
      </View> : <>
        <View style={s.card}>
          <Text style={s.section}>Mã đơn hàng</Text>
          <TouchableOpacity onPress={()=>copy(order.order_code)}><Text style={s.code}>{order.order_code} <Ionicons name="copy-outline" size={18}/></Text></TouchableOpacity>
          <Text style={s.hint}>{timeLeft>0?`Thời gian còn lại: ${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`:'Đã quá thời hạn: không chuyển khoản mới với mã đơn này.'}</Text>
        </View>
        {timeLeft>0&&<View style={s.card}>
          <Text style={s.section}>Quét QR để chuyển khoản</Text>
          {qr&&<Image source={{uri:qr}} style={s.qr} resizeMode="contain" />}
          <Text style={s.hint}>Nếu QR không tải được, chuyển khoản theo thông tin bên dưới.</Text>
          <Text style={s.label}>Ngân hàng</Text><Text style={s.value}>{BANK_LABELS[bank.bank_code]||bank.bank_code}</Text>
          <Text style={s.label}>Số tài khoản</Text><TouchableOpacity onPress={()=>copy(bank.account_number)}><Text style={s.value}>{bank.account_number} <Ionicons name="copy-outline" size={15}/></Text></TouchableOpacity>
          <Text style={s.label}>Chủ tài khoản</Text><Text style={s.value}>{bank.account_holder}</Text>
          <Text style={s.label}>Nội dung chuyển khoản</Text><TouchableOpacity onPress={()=>copy(order.order_code)}><Text style={s.value}>{order.order_code} <Ionicons name="copy-outline" size={15}/></Text></TouchableOpacity>
          <Text style={s.warning}>Chỉ chuyển đúng {fmt(order.amount)} với nội dung {order.order_code}. Không gửi lại tiền cho cùng đơn nếu app chưa cập nhật.</Text>
        </View>}
        <TouchableOpacity
          style={[
            s.card,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          ]}
          onPress={() => setInvoiceOpen(true)}
        >
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
            <Ionicons
              name="receipt-outline"
              size={23}
              color="#2563EB"
            />
            <Text style={s.section}>
              Quản Lý Hóa Đơn
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color="#64748B"
          />
        </TouchableOpacity>

        <View style={s.card}>
          <Text style={s.section}>Xác nhận thanh toán</Text>
          <Text style={s.tip}>Sau khi chuyển khoản thành công trên ứng dụng ngân hàng, bấm nút bên dưới để hệ thống xác nhận giao dịch.</Text>
          <TouchableOpacity
            style={[s.button, (checkingNow || paid) && s.disabled]}
            disabled={checkingNow || paid}
            onPress={confirmPaymentNow}
            accessibilityRole="button"
            accessibilityLabel="Tôi Đã Thanh Toán">
            {checkingNow ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Tôi Đã Thanh Toán</Text>}
          </TouchableOpacity>
          {checkingNow && <Text style={s.hint}>Đang kiểm tra giao dịch ngân hàng, vui lòng chờ...</Text>}
          {!!paymentCheckError && <Text style={s.error}>{paymentCheckError}</Text>}
        </View>
      </>}
    </ScrollView>

    <PaymentNotice
      visible={!!notice}
      title={notice?.title}
      message={notice?.message}
      type={notice?.type}
      onClose={() => setNotice(null)}
    />
  </SafeAreaView>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F8FAFC'},top:{padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#fff'},title:{color:'#0F172A',fontSize:17,fontWeight:'700'},content:{padding:16,paddingBottom:50,gap:14},
  priceBox:{backgroundColor:'#2563EB',padding:22,borderRadius:20},priceTitle:{color:'#DBEAFE',fontSize:13},price:{color:'#fff',fontSize:32,fontWeight:'800',marginVertical:8},light:{color:'#BFDBFE'},
  card:{backgroundColor:'#fff',padding:18,borderRadius:18,gap:12},section:{fontSize:17,fontWeight:'800',color:'#0F172A'},tip:{fontSize:13,lineHeight:19,color:'#475569'},hint:{fontSize:12,color:'#64748B',lineHeight:18},error:{fontSize:13,color:'#DC2626'},
  button:{backgroundColor:'#2563EB',padding:15,borderRadius:12,alignItems:'center',marginTop:4},buttonText:{color:'#fff',fontSize:14,fontWeight:'700'},disabled:{opacity:0.5},outline:{backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE'},outlineText:{color:'#1D4ED8',fontWeight:'700'},
  code:{fontSize:28,letterSpacing:2,fontWeight:'800',color:'#2563EB'},qr:{width:'100%',height:255,backgroundColor:'#fff'},label:{fontSize:12,color:'#64748B'},value:{fontSize:17,color:'#0F172A',fontWeight:'700'},warning:{color:'#92400E',backgroundColor:'#FFFBEB',padding:12,borderRadius:10,fontSize:13,lineHeight:19},
});
