import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { profile } from './profile';

const fire = (style: ImpactStyle): void => {
  if (!profile.settings.vibration) return;
  Haptics.impact({ style }).catch(() => undefined);
};

export const haptics = {
  light: () => fire(ImpactStyle.Light),
  medium: () => fire(ImpactStyle.Medium),
  heavy: () => fire(ImpactStyle.Heavy),
};
