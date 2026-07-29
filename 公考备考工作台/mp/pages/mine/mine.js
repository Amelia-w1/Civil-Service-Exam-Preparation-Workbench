const { call } = require('../../utils/api');

Page({
  data: { profile: {}, progress: {}, initing: false },

  async onShow() {
    try {
      const st = await call('state');
      this.setData({ profile: st.profile, progress: st.progress });
    } catch (e) { }
  },

  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },

  async initData() {
    wx.showLoading({ title: '初始化中' });
    try {
      const r = await call('init', {});
      wx.hideLoading();
      wx.showModal({
        title: '初始化完成', content: '已把题库/知识点/错题等导入云端。\n' + JSON.stringify(r.report || {}), showCancel: false
      });
      this.onShow();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '初始化失败', icon: 'none' });
    }
  }
});
