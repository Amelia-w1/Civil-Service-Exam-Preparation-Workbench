const { call } = require('../../utils/api');
const app = getApp();
const NAMES = ['资料分析', '言语理解', '判断推理', '数量关系', '常识判断'];

Page({
  data: { modules: [], totalQuestions: 0, bankByMod: {} },
  async onShow() {
    try {
      const st = await call('state');
      const mp = (st.progress && st.progress.moduleProgress) || {};
      const modules = NAMES.map(n => ({
        name: n,
        status: (mp[n] && mp[n].status) || '未启动',
        weak: (mp[n] && mp[n].weak) || [],
        count: (st.quizBank && st.quizBank._byMod && st.quizBank._byMod[n]) || 0
      }));
      this.setData({ modules, totalQuestions: (st.quizBank && st.quizBank._total) || 0 });
    } catch (e) { }
  },
  openModule(e) {
    app.globalData.quizModule = e.currentTarget.dataset.m;
    wx.switchTab({ url: '/pages/quiz/quiz' });
  }
});
