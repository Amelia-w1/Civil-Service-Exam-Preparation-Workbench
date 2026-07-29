const { call } = require('../../utils/api');
const MODS = ['资料分析', '言语理解', '判断推理', '数量关系', '常识判断'];
const REASONS = ['知识点不熟', '粗心大意', '审题偏差', '计算失误'];

Page({
  data: {
    errors: [], showAdd: false, mods: MODS, reasons: REASONS,
    modIndex: 0, reasonIndex: 0,
    form: { point: '', note: '', images: [] }
  },

  async onShow() { await this.load(); },

  async load() {
    try {
      const st = await call('state');
      this.setData({ errors: st.errors });
    } catch (e) { }
  },

  toggleAdd() { this.setData({ showAdd: !this.data.showAdd }); },
  changeMod(e) { this.setData({ modIndex: Number(e.detail.value) }); },
  changeReason(e) { this.setData({ reasonIndex: Number(e.detail.value) }); },
  onPoint(e) { this.setData({ 'form.point': e.detail.value }); },
  onNote(e) { this.setData({ 'form.note': e.detail.value }); },

  async chooseImage() {
    const r = await wx.chooseMedia({ count: 3, mediaType: ['image'] });
    wx.showLoading({ title: '上传中' });
    const imgs = [];
    for (const f of r.tempFiles) {
      const up = await wx.cloud.uploadFile({
        cloudPath: 'errors/' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.jpg',
        filePath: f.tempFilePath
      });
      imgs.push(up.fileID);
    }
    wx.hideLoading();
    this.setData({ 'form.images': this.data.form.images.concat(imgs) });
  },

  async aiRecognize() {
    wx.showModal({
      title: 'AI 识别', content: '拍照自动识别录入需在「设置」中填入云端多模态 API Key（如混元）后即可启用。当前可手动填写考点与备注。', showCancel: false
    });
  },

  async save() {
    const f = this.data.form;
    if (!f.point && !f.note) { wx.showToast({ title: '填一下考点或备注', icon: 'none' }); return; }
    await call('error', {
      body: {
        module: this.data.mods[this.data.modIndex],
        point: f.point, reason: this.data.reasons[this.data.reasonIndex],
        note: f.note, images: f.images
      }
    });
    this.setData({ showAdd: false, form: { point: '', note: '', images: [] } });
    this.load();
  },

  async review(e) {
    await call('errorReview', { body: { id: e.currentTarget.dataset.id, result: '已掌握' } });
    wx.showToast({ title: '已复盘', icon: 'success' });
    this.load();
  },

  preview(e) {
    const urls = this.data.errors.filter(x => x.images && x.images.length).map(x => x.images).flat();
    if (urls.length) wx.previewImage({ urls, current: e.currentTarget.dataset.url });
  }
});
