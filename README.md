# 强化石等级推荐器

根据**后期锚定指数模型**，由当前强化花费 **C（单位 k）** 反推推荐的强化石整数等级 **d ∈ {1,…,9}**。

## 在线使用（网页版）

部署 GitHub Pages 后访问：

**https://tong815.github.io/shenqu-stone-recommender/**

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

## 推送到 GitHub（首次）

本地仓库已初始化。请先在 GitHub 网页创建空仓库：

**https://github.com/new** → 仓库名 `shenqu-stone-recommender` → Public → 不要勾选 README

然后在项目目录执行：

```bash
cd "c:\Users\chena\Desktop\神曲选强化石"
git remote set-url origin https://github.com/tong815/shenqu-stone-recommender.git
git push -u origin main
```

推送完成后：

1. 打开仓库 **Settings → Pages**
2. **Build and deployment** 选 **GitHub Actions**
3. 等待 Actions 里 `Deploy GitHub Pages` 工作流跑绿

约 1–2 分钟后访问：**https://tong815.github.io/shenqu-stone-recommender/**

## License

MIT
