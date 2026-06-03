# 执业医题眼诊断练习

## 直接打开

双击 `index.html` 即可在电脑浏览器中打开。

## 运行测试

```powershell
Set-Location 'C:\Users\Administrator\Desktop\执业医\diagnosis-quiz'
node --test
```

## 手机使用

如果想让手机和电脑同时访问，可以在同一局域网内启动一个简单的静态服务：

```powershell
Set-Location 'C:\Users\Administrator\Desktop\执业医\diagnosis-quiz'
python -m http.server 4173
```

然后在手机浏览器访问电脑的局域网地址，例如：

`http://192.168.1.10:4173/`

## 长期稳定外网访问

这个项目已经补好了 `GitHub Pages` 发布工作流：

- `.github/workflows/deploy-pages.yml`

只要把 `diagnosis-quiz` 整个文件夹作为一个 GitHub 仓库推到 `main` 分支，再在 GitHub 仓库设置里启用 `Pages` 的 `GitHub Actions` 部署方式，就会得到一个长期稳定的网址。

常见网址形态：

- `https://你的用户名.github.io/仓库名/`

如果你把仓库名设为 `username.github.io`，还可以直接得到：

- `https://username.github.io/`
