// Helper responsive cho bản web/desktop (Electron).
// Trên mobile (Android/iOS) mọi hàm trả về bố cục 1 cột như cũ — không đổi hành vi.
import { Platform, useWindowDimensions } from 'react-native';

export const IS_WEB = Platform.OS === 'web';

// Số cột lưới theo bề rộng cửa sổ: >=1100 → 3 cột, >=720 → 2 cột, còn lại 1.
export function useGridColumns() {
  const { width } = useWindowDimensions();
  if (!IS_WEB) return 1;
  if (width >= 1100) return 3;
  if (width >= 720) return 2;
  return 1;
}

// Style bề rộng cho 1 card trong lưới (dùng kèm container gridWrapStyle).
export function gridCardWidth(cols) {
  if (cols === 3) return { width: '32.4%' };
  if (cols === 2) return { width: '49.2%' };
  return { width: '100%' };
}

export const gridWrapStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
};
