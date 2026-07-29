const { call } = require('../../utils/api');
const MODS = ['资料分析', '言语理解', '判断推理', '数量关系', '常识判断'];

Page({
  data: { mp: {}, unreviewed: [] },

  async onShow() {
    try {
      const st = await call('state');
      const mp = (st.progress && st.progress.moduleProgress) || {};
      const unreviewed = (st.errors || []).filter(e => !e.reviewed);
      this.setData({ mp, unreviewed });
    } catch (e) { }
  },

  async review(e) {
    await call('errorReview', { body: { id: e.currentTarget.dataset.id, result: '已掌握' } });
    wx.showToast({ title: '已复盘', icon: 'success' });
    this.onShow();
  }
});
