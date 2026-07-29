const { call } = require('../../utils/api');

Page({
  data: { list: [], showAdd: false, f: { cat: '', event: '', point: '', angle: '' } },

  async onShow() {
    try {
      const st = await call('state');
      this.setData({ list: st.politics || [] });
    } catch (e) { }
  },

  toggleAdd() { this.setData({ showAdd: !this.data.showAdd }); },
  onInput(e) { const k = e.currentTarget.dataset.k; this.setData({ ['f.' + k]: e.detail.value }); },

  async save() {
    const f = this.data.f;
    if (!f.event) { wx.showToast({ title: '填事件名', icon: 'none' }); return; }
    await call('politics', { body: { cat: f.cat, event: f.event, point: f.point, angle: f.angle } });
    this.setData({ showAdd: false, f: { cat: '', event: '', point: '', angle: '' } });
    this.onShow();
  }
});
