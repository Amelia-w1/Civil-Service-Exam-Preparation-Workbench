const { call } = require('../../utils/api');
const MODS = ['资料分析', '言语理解', '判断推理', '数量关系', '常识判断'];

Page({
  data: { list: [], showAdd: false, mods: MODS, scores: {}, plan: '' },

  async onShow() {
    try {
      const st = await call('state');
      this.setData({ list: st.mocks || [] });
    } catch (e) { }
  },

  toggleAdd() {
    const s = {};
    MODS.forEach(m => s[m] = { right: '', total: '' });
    this.setData({ showAdd: !this.data.showAdd, scores: s });
  },

  onScore(e) {
    const m = e.currentTarget.dataset.m, k = e.currentTarget.dataset.k;
    const scores = this.data.scores;
    scores[m][k] = e.detail.value;
    this.setData({ scores });
  },

  onPlan(e) { this.setData({ plan: e.detail.value }); },

  async save() {
    const scores = {};
    let valid = false;
    MODS.forEach(m => {
      const r = Number(this.data.scores[m].right), t = Number(this.data.scores[m].total);
      if (t > 0) { scores[m] = { right: r, total: t }; valid = true; }
    });
    if (!valid) { wx.showToast({ title: '至少填一个模块', icon: 'none' }); return; }
    await call('mock', { body: { scores, plan: this.data.plan } });
    this.setData({ showAdd: false });
    this.onShow();
  }
});
