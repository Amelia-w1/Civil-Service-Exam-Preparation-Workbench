const { call } = require('../../utils/api');

Page({
  data: {
    dailyWords: [], dailyQuote: {}, myWords: [], myQuotes: [],
    showAdd: false, kind: 'word',
    f: { topic: '', oral: '', standard: '', text: '', pos: '' }
  },

  async onShow() {
    try {
      const st = await call('state');
      const s = st.today.shenlun;
      this.setData({ dailyWords: s.dailyWords, dailyQuote: s.dailyQuote, myWords: s.myWords, myQuotes: s.myQuotes });
    } catch (e) { }
  },

  toggleAdd() { this.setData({ showAdd: !this.data.showAdd }); },
  setKind(e) { this.setData({ kind: e.currentTarget.dataset.k }); },
  onInput(e) { const k = e.currentTarget.dataset.k; this.setData({ ['f.' + k]: e.detail.value }); },

  async save() {
    const f = this.data.f;
    if (this.data.kind === 'word') {
      if (!f.oral || !f.standard) { wx.showToast({ title: '填口语+规范', icon: 'none' }); return; }
      await call('shenlunWord', { body: { topic: f.topic, oral: f.oral, standard: f.standard } });
    } else {
      if (!f.text) { wx.showToast({ title: '填金句内容', icon: 'none' }); return; }
      await call('shenlunQuote', { body: { topic: f.topic, text: f.text, pos: f.pos } });
    }
    this.setData({ showAdd: false, f: { topic: '', oral: '', standard: '', text: '', pos: '' } });
    this.onShow();
  }
});
