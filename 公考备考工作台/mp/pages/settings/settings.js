const { call } = require('../../utils/api');

Page({
  data: { p: {} },

  async onLoad() {
    try {
      const st = await call('state');
      this.setData({ p: st.profile || {} });
    } catch (e) { }
  },

  onInput(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ ['p.' + k]: e.detail.value });
  },

  onDate(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ ['p.' + k]: e.detail.value });
  },

  async save() {
    wx.showLoading({ title: '保存中' });
    try {
      await call('profile', { body: this.data.p });
      wx.hideLoading();
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
