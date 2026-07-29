const { call } = require('../../utils/api');

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr + 'T00:00:00');
  const n = new Date();
  const today = new Date(n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0') + 'T00:00:00');
  return Math.floor((t - today) / 86400000);
}

Page({
  data: { profile: {}, progress: {}, today: null, checked: {}, gkLeft: null, skLeft: null, checkedIn: false },

  async onShow() { await this.load(); },

  async load() {
    try {
      const st = await call('state');
      const checked = {};
      const comp = (st.progress && st.progress.today && st.progress.today.completed) || [];
      comp.forEach(id => checked[id] = true);
      const p = st.profile || {};
      const checkIns = (st.progress && st.progress.checkIns) || [];
      const t = new Date();
      const tstr = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
      this.setData({
        profile: p, progress: st.progress, today: st.today,
        checked, gkLeft: daysLeft(p.gkDate), skLeft: daysLeft(p.skDate),
        checkedIn: checkIns.includes(tstr)
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async toggleTask(e) {
    const id = e.currentTarget.dataset.id;
    const checked = this.data.checked;
    checked[id] = !checked[id];
    this.setData({ checked });
    await call('todayTask', { body: { id: id, done: checked[id] } }).catch(() => {});
  },

  async doCheckin() {
    if (this.data.checkedIn) { wx.showToast({ title: '今日已打卡', icon: 'none' }); return; }
    await call('checkin', {});
    wx.showToast({ title: '打卡成功', icon: 'success' });
    this.load();
  },

  goSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },
  goError() { wx.switchTab({ url: '/pages/error/error' }); }
});
