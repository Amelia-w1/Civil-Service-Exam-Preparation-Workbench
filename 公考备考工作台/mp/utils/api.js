// 统一的云函数调用封装
function call(action, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'api',
      data: Object.assign({ action: action }, data || {}),
      success: res => {
        const r = res.result;
        if (r && r.error) reject(new Error(r.error));
        else resolve(r);
      },
      fail: err => reject(err)
    });
  });
}
module.exports = { call };
