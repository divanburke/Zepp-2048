import { BaseApp } from '@zeppos/zml/base-app';

App(
  BaseApp({
    globalData: {},

    onCreate(options) {
      console.log('2048 app onCreate');
    },

    onDestroy(options) {
      console.log('2048 app onDestroy');
    }
  })
);
