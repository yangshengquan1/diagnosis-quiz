# 执业医题眼诊断练习

一个可部署到 GitHub Pages、支持手机和电脑访问、可安装到主屏幕的诊断刷题应用。

## 本地预览

```powershell
Set-Location 'C:\Users\Administrator\Desktop\执业医\diagnosis-quiz'
npm run serve
```

打开：

- `http://127.0.0.1:4173/`

如果需要让同一局域网里的手机访问，可以把电脑的局域网地址发给手机浏览器，例如：

- `http://192.168.1.10:4173/`

## 运行测试

```powershell
Set-Location 'C:\Users\Administrator\Desktop\执业医\diagnosis-quiz'
npm test
```

## GitHub Pages 发布

仓库里已经包含发布工作流：

- `.github/workflows/deploy-pages.yml`

发布步骤：

1. 把 `diagnosis-quiz` 推送到 GitHub 仓库的 `main` 分支
2. 打开仓库设置里的 `Pages`
3. 将部署来源设置为 `GitHub Actions`
4. 等待 `Deploy GitHub Pages` 工作流完成

发布成功后，你会得到一个固定公网网址。电脑关机后，这个网址仍然可以访问，也可以直接分享给别人使用。

常见网址格式：

- `https://你的用户名.github.io/仓库名/`

如果仓库名本身就是 `username.github.io`，那么网址通常是：

- `https://username.github.io/`

## 当前能力

- 手机和电脑都可访问
- 支持分类练习、随机练习、错题本
- 支持添加到主屏幕
- 支持基础离线缓存
- 做题记录保存在当前设备浏览器本地

## 说明

- 不同设备之间的练习进度不会自动同步
- 首次访问仍需要联网加载站点
