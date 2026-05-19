# 强化石等级推荐器

根据**后期锚定指数模型**，由当前强化花费 **C（单位 k）** 反推推荐的强化石整数等级 **d ∈ {1,…,9}**。

## 在线使用（网页版）

部署 GitHub Pages 后访问：

**https://\<你的用户名\>.github.io/shenqu-stone-recommender/**

（首次推送后需在仓库 **Settings → Pages** 中确认 Source 为 **GitHub Actions**。）

本地预览网页：

```bash
# Python 3
py -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 桌面版（可选）

需要 Python 3.10+：

```bash
py -m pip install -r requirements-desktop.txt
py calc_C.py
```

## 数学模型

- `p = (d + 1) / 10`
- `f(p) = 300 × 1024^(p − 1)`（9 级锚定费用 300，每升 1 级费用翻倍）
- `f′(p) = 10·ln(2)·f(p)`
- `C(d) = p·f′(p) − f(p)`

反推步骤：

1. 在连续区间 `d ∈ [1, 9]` 上解 `C(d) = target_C` 得 `d_cont`（网页版用二分法，桌面版用 `scipy.optimize.brentq`）
2. 在 `floor(d_cont)` 与 `ceil(d_cont)` 中比较 `|C(d) − target_C|`，取误差更小者（不四舍五入）

## 项目结构

```
├── index.html          # 网页入口（GitHub Pages）
├── css/style.css
├── js/model.js         # 模型与计算
├── js/app.js           # 界面与图表
├── calc_C.py           # Tkinter 桌面版
└── requirements-desktop.txt
```

## 推送到 GitHub

```bash
git init
git add .
git commit -m "feat: 网页版强化石等级推荐器 + GitHub Pages"
git branch -M main
git remote add origin https://github.com/<用户名>/shenqu-stone-recommender.git
git push -u origin main
```

推送后在仓库启用 **Pages → Build and deployment → GitHub Actions** 即可自动发布。

## License

MIT
