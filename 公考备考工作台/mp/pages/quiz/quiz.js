const { call } = require('../../utils/api');
const app = getApp();
const MODS = ['全部', '资料分析', '言语理解', '判断推理', '数量关系', '常识判断'];
const LETTERS = ['A', 'B', 'C', 'D'];

Page({
  data: {
    mods: MODS, modIndex: 0, mode: 'random',
    questions: [], idx: 0, cur: null, selected: null,
    answered: false, right: null, parse: '', point: '', total: 0, done: 0, finished: false
  },

  onShow() {
    const m = app.globalData.quizModule;
    if (m) {
      const i = MODS.indexOf(m);
      if (i >= 0) this.setData({ modIndex: i });
      app.globalData.quizModule = null;
    }
    this.start();
  },

  async start() {
    wx.showLoading({ title: '出题中' });
    try {
      const mod = this.data.mods[this.data.modIndex];
      const list = await call('quiz', { module: mod, n: 10, mode: this.data.mode });
      this.setData({ questions: list, idx: 0, selected: null, answered: false, finished: false, done: 0, total: list.length });
      this.showCur();
    } catch (e) {
      wx.showToast({ title: '出题失败', icon: 'none' });
    }
    wx.hideLoading();
  },

  showCur() {
    const c = this.data.questions[this.data.idx];
    this.setData({ cur: c, selected: null, answered: false, right: null, parse: '', point: '' });
  },

  selectOpt(e) {
    if (this.data.answered) return;
    this.setData({ selected: Number(e.currentTarget.dataset.i) });
  },

  async submit() {
    if (this.data.selected === null) { wx.showToast({ title: '请先选择', icon: 'none' }); return; }
    const c = this.data.cur;
    const ans = LETTERS[this.data.selected];
    try {
      const r = await call('quizSubmit', { id: c.id, answer: ans, reason: '知识点不熟' });
      this.setData({ answered: true, right: r.right, parse: r.parse, point: r.point });
      this.setData({ done: this.data.done + 1 });
      await call('questionLog', { body: { n: 1 } });
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  },

  next() {
    if (this.data.idx + 1 >= this.data.total) { this.setData({ finished: true }); return; }
    this.setData({ idx: this.data.idx + 1 }, () => this.showCur());
  },

  changeMod(e) { this.setData({ modIndex: Number(e.detail.value) }); this.start(); },
  setMode(e) { this.setData({ mode: e.currentTarget.dataset.mode }); this.start(); },
  restart() { this.start(); }
});
