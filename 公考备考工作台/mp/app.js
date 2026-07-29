// 公考备考工作台 · 小程序入口
App({
  globalData: {
    // 替换为你自己的云开发环境 ID（在云开发控制台「设置-环境」中查看）
    env: '请替换为你自己的云开发环境ID'
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发，请使用 2.2.3 或以上版本');
      return;
    }
    wx.cloud.init({
      env: this.globalData.env,
      traceUser: true
    });
  }
});
