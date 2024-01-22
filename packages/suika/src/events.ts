import { EventEmitter } from '@suika/common';

import { SupportedLocale } from './locale';

interface Events {
  localeChange: (locale: SupportedLocale) => void;
}

export const appEventEmitter = new EventEmitter<Events>();
