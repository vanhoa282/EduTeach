import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminPaymentConfig } from '../../lib/paymentGateway';

const BANKS = [
  {code:'ACB', label:'ACB - Á Châu'},
  {code:'MB', label:'MB Bank'},
  {code:'VCB', label:'Vietcombank'},
  {code:'BIDV', label:'BIDV (V3)'},
];
export default function PaymentGatewayScreen({user,onBack}) {
  const [adminPass,setAdminPass] = useState('');
  const [unlocked,setUnlocked] = useState(false);
  const [busy,setBusy] = useState(false);
  const [bank,setBank] = useState('ACB');
  const [account,setAccount] = useState('');
  const [holder,setHolder] = useState('');
  const [apiToken,setApiToken] = useState('');
  const [hasToken,setHasToken] = useState(false);
  const [testAt,setTestAt] = useState(null);
  const [enabled,setEnabled] = useState(false);
  const [syncAt,setSyncAt] = useState(null);
  const [syncStatus,setSyncStatus] = useState('');

  const applyConfig = (c) => {
    if (!c) return;
    setBank(c.bank_code || 'ACB'); setAccount(c.account_number || '');
    setHolder(c.account_holder || ''); setHasToken(!!c.has_token);
    setTestAt(c.last_test_at || null); setEnabled(!!c.auto_enabled);
    setSyncAt(c.last_sync_at || null); setSyncStatus(c.last_sync_status || '');
    setApiToken('');
  };
  const call = async (action,fields) => {
    setBusy(true);
    const r = await adminPaymentConfig(action,user.phone,adminPass,fields);
    setBusy(false);
    if (r.error) { Alert.alert('Không thành công',r.error); return null; }
    if (r.config) applyConfig(r.config);
    return r;
  };
  const open = async () => {const r=await call('get');if(r) setUnlocked(true);};
  const save = async () => {
    const r=await call('save',{bank_code:bank,account_number:account.trim(),account_holder:holder.trim(),api_token:apiToken.trim()});
    if(r) Alert.alert('Đã lưu','Đã lưu cấu hình. Kiểm tra API5S một lần; hệ thống sẽ tự bật đối soát.');
  };
  const test = async () => {const r=await call('test');if(r) Alert.alert('Kiểm tra kết nối',r.message || 'Kết nối OK');};
  const input = (label,value,onChange,placeholder,secure=false) => (
    <View style={s.field}><Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor="#94A3B8" secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} />
    </View>
  );
  return <SafeAreaView style={s.root} edges={['top']}>
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.back}><Ionicons name="arrow-back" size={22} color="#0F172A"/></TouchableOpacity>
      <Text style={s.title}>Cấu hình thanh toán</Text><View style={{width:38}}/>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {!unlocked ? <View style={s.card}>
        <Ionicons name="shield-checkmark" color="#7C3AED" size={40} style={{alignSelf:'center'}} />
        <Text style={s.subtitle}>Xác thực Admin</Text>
        <Text style={s.hint}>Nhập lại mật khẩu Admin để xem và sửa kết nối thanh toán.</Text>
        {input('Mật khẩu Admin',adminPass,setAdminPass,'Mật khẩu Admin',true)}
        <TouchableOpacity style={s.btn} disabled={busy} onPress={open}>
          {busy?<ActivityIndicator color="#fff"/>:<Text style={s.btnText}>Mở khóa</Text>}
        </TouchableOpacity>
      </View> : <>
        <View style={s.card}>
          <Text style={s.section}>Nguồn đối soát</Text>
          <View style={s.locked}><Ionicons name="lock-closed-outline" color="#64748B" size={18}/>
            <Text style={s.lockedText}>api5s.com</Text><Text style={s.tag}>Cố định</Text></View>
          <Text style={s.hint}>Có thể thêm nhà cung cấp khác sau này, không sửa nguồn đang sử dụng.</Text>
          <Text style={s.section}>Ngân hàng nhận tiền</Text>
          <View style={s.bankGrid}>{BANKS.map(b=><TouchableOpacity key={b.code}
            onPress={()=>{setBank(b.code);setTestAt(null);}}
            style={[s.bankButton,bank===b.code&&s.bankSelected]}>
              <Text style={[s.bankText,bank===b.code&&s.bankSelectedText]}>{b.label}</Text>
            </TouchableOpacity>)}</View>
          {input('Số tài khoản dùng cho API và QR',account,setAccount,'Nhập số tài khoản')}
          {input('Tên chủ tài khoản hiển thị',holder,setHolder,'NGUYEN VAN A')}
          {input('Token API5S',apiToken,setApiToken,hasToken?'Đã lưu token - để trống nếu không đổi':'Nhập Token API5S',true)}
          <Text style={s.hint}>{hasToken?'✓ Đã có token. ':''}Token không được hiển thị lại sau khi lưu. Không nhập tên đăng nhập hoặc mật khẩu ngân hàng vào EduTeach.</Text>
          <TouchableOpacity style={[s.btn,s.outline]} disabled={busy} onPress={save}>
            {busy?<ActivityIndicator color="#7C3AED"/>:<Text style={[s.btnText,{color:'#7C3AED'}]}>Lưu cấu hình</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} disabled={busy||!hasToken} onPress={test}>
            {busy?<ActivityIndicator color="#fff"/>:<Text style={s.btnText}>Kiểm tra kết nối API5S</Text>}
          </TouchableOpacity>
          <Text style={s.hint}>{testAt?'✓ API kiểm tra lần cuối: '+new Date(testAt).toLocaleString('vi-VN'):'Chưa xác minh được Token API5S'}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.section}>Tự động đối soát</Text>
          <Text style={{color:enabled?'#047857':'#B45309',fontWeight:'700'}}>
            {enabled?'✓ TỰ ĐỘNG ĐỐI SOÁT ĐANG BẬT':'⚠ CHƯA KẾT NỐI: Hãy lưu cấu hình và kiểm tra API5S'}
          </Text>
          <Text style={s.hint}>Không có chế độ duyệt thủ công cho giao dịch hợp lệ. Sau khi kiểm tra Token thành công, hệ thống tự bật đối soát; Cron 5 giây sẽ tự kiểm tra ngân hàng.</Text>
          <Text style={s.hint}>Lần đồng bộ: {syncAt?new Date(syncAt).toLocaleString('vi-VN'):'Chưa chạy'}</Text>
          <Text style={s.hint}>Trạng thái: {syncStatus || 'Chưa có dữ liệu'}</Text>
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F8FAFC'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#fff',padding:12},
  back:{width:38,height:38,justifyContent:'center',alignItems:'center'},title:{fontSize:17,fontWeight:'700',color:'#0F172A'},content:{padding:16,paddingBottom:40,gap:16},
  card:{padding:18,borderRadius:18,backgroundColor:'#fff',gap:12},section:{fontSize:16,fontWeight:'800',color:'#7C3AED',marginTop:4},
  subtitle:{fontSize:18,fontWeight:'800',color:'#0F172A',textAlign:'center'},hint:{fontSize:12,lineHeight:18,color:'#64748B'},
  label:{fontSize:13,fontWeight:'600',color:'#334155',marginBottom:6},field:{gap:2},input:{backgroundColor:'#F8FAFC',borderColor:'#E2E8F0',borderWidth:1,borderRadius:12,padding:12,color:'#0F172A',fontSize:15},
  btn:{backgroundColor:'#7C3AED',padding:15,borderRadius:12,alignItems:'center',justifyContent:'center'},outline:{backgroundColor:'#fff',borderWidth:1,borderColor:'#7C3AED'},btnText:{color:'#fff',fontWeight:'700',fontSize:15},
  locked:{padding:14,backgroundColor:'#F1F5F9',borderRadius:12,flexDirection:'row',gap:10,alignItems:'center'},lockedText:{flex:1,color:'#0F172A',fontWeight:'700'},tag:{fontSize:11,color:'#64748B'},
  bankGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},bankButton:{borderRadius:12,borderWidth:1,borderColor:'#E2E8F0',padding:12},bankSelected:{borderColor:'#7C3AED',backgroundColor:'#F5F3FF'},bankText:{color:'#475569',fontSize:13},bankSelectedText:{color:'#7C3AED',fontWeight:'700'},
  switchRow:{flexDirection:'row',alignItems:'center',gap:12},
});
