"""
强化石等级推荐器：后期锚定指数模型 + 由当前强化花费 C（单位 k）反推推荐等级。
"""

import math
import tkinter as tk
from tkinter import messagebox, ttk

import matplotlib

matplotlib.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
matplotlib.rcParams["axes.unicode_minus"] = False

import numpy as np
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure
from scipy.optimize import brentq

# ---------------------------------------------------------------------------
# 模型常量
# ---------------------------------------------------------------------------
D_MIN, D_MAX = 1.0, 9.0
ANCHOR_COST = 300.0
LN2_10 = 10.0 * np.log(2.0)  # ln(1024) = 10*ln(2)

# 启动时预计算 C(d) 曲线（只算一次）
D_GRID = np.linspace(D_MIN, D_MAX, 500)


def p_from_d(d: float) -> float:
    """等级 d → 成功概率 p = (d + 1) / 10。"""
    return (d + 1) / 10


def f(p) -> float | np.ndarray:
    """费用 f(p) = 300 * 1024^(p - 1)。"""
    return ANCHOR_COST * (1024.0 ** (p - 1.0))


def f_prime(p) -> float | np.ndarray:
    """f'(p) = 10*ln(2)*f(p)。"""
    return LN2_10 * f(p)


def C(p) -> float | np.ndarray:
    """C(p) = p*f'(p) - f(p) = f(p) * (10*ln(2)*p - 1)。"""
    return f(p) * (LN2_10 * p - 1.0)


def C_at_d(d: float) -> float:
    """连续函数 C(d)。"""
    return float(C(p_from_d(d)))


C_GRID = C(p_from_d(D_GRID))


def solve_continuous_d(target_C: float) -> float:
    """
    在 d ∈ [1, 9] 上求 C(d) = target_C 的连续解 d_cont。
    C(d) 单调递增，用 brentq；越界则夹到端点。
    """
    c_lo = C_at_d(D_MIN)
    c_hi = C_at_d(D_MAX)

    if target_C <= c_lo:
        return D_MIN
    if target_C >= c_hi:
        return D_MAX

    return float(brentq(lambda d: C_at_d(d) - target_C, D_MIN, D_MAX))


def _discrete_candidates(d_cont: float) -> list[int]:
    """floor/ceil(d_cont) 限制在 1..9。"""
    raw = {math.floor(d_cont), math.ceil(d_cont)}
    return sorted({int(min(D_MAX, max(D_MIN, x))) for x in raw})


def n(p) -> float | np.ndarray:
    """单次强化石费用 n(p)，与 f(p) 相同。"""
    return f(p)


def E_success(p: float, c: float) -> float:
    """成功升级花费期望 E(p) = (n(p) + c) / p。"""
    return (float(n(p)) + c) / p


def E_at_d(d: float, input_C: float) -> float:
    return E_success(p_from_d(d), input_C)


def recommend_discrete_d(d_cont: float, input_C: float) -> int:
    """
    在 floor/ceil 候选中选 E(p)=(n(p)+c)/p 更小者。
    不比 C(d)（C(d) 随 d 单调增，会退化成退一法）。
    """
    candidates = _discrete_candidates(d_cont)
    best_d = candidates[0]
    best_e = E_at_d(best_d, input_C)
    for d_int in candidates[1:]:
        e = E_at_d(d_int, input_C)
        if e < best_e:
            best_d = d_int
            best_e = e
    return best_d


class StoneRecommenderApp:
    """强化石等级推荐器主界面。"""

    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("强化石等级推荐器")
        self.root.minsize(640, 520)

        # 标记线句柄（确认后只更新这些，不重算 C_GRID）
        self._hline = None
        self._vline_rec = None

        self._build_widgets()
        self._init_plot()

    def _build_widgets(self) -> None:
        pad = {"padx": 10, "pady": 4}

        ttk.Label(
            self.root,
            text="请输入当前强化花费 C，单位为 k",
            font=("", 11),
        ).pack(anchor="w", **pad)

        input_row = ttk.Frame(self.root)
        input_row.pack(fill="x", **pad)

        ttk.Label(input_row, text="C =").pack(side="left")
        self.entry_c = ttk.Entry(input_row, width=20)
        self.entry_c.pack(side="left", padx=(4, 8))
        self.entry_c.bind("<Return>", lambda _e: self._on_calculate())

        ttk.Button(input_row, text="确认", command=self._on_calculate).pack(side="left")

        # 输入行右侧：强调展示推荐整数等级
        highlight = ttk.Frame(input_row)
        highlight.pack(side="left", padx=(28, 0))
        ttk.Label(highlight, text="推荐等级 d：", font=("", 11)).pack(side="left")
        self.lbl_d_highlight = ttk.Label(
            highlight,
            text="—",
            font=("Microsoft YaHei", 22, "bold"),
            foreground="#6d28d9",
        )
        self.lbl_d_highlight.pack(side="left", padx=(6, 0))

        # 结果输出区
        result_frame = ttk.LabelFrame(self.root, text="计算结果", padding=8)
        result_frame.pack(fill="x", **pad)

        self.result_labels: dict[str, ttk.Label] = {}
        fields = [
            ("input_c", "输入 C (k)"),
            ("p_rec", "成功率 p"),
            ("e_rec", "E(p)=(f+C)/p (k)"),
            ("model_c", "参考 C(d) (k)"),
        ]
        for key, title in fields:
            row = ttk.Frame(result_frame)
            row.pack(fill="x", pady=2)
            ttk.Label(row, text=f"{title}：", width=22).pack(side="left")
            lbl = ttk.Label(row, text="—", font=("Consolas", 10))
            lbl.pack(side="left", anchor="w")
            self.result_labels[key] = lbl

        # 底部 C(d) 图
        plot_frame = ttk.LabelFrame(self.root, text="C(d) 曲线", padding=4)
        plot_frame.pack(fill="both", expand=True, **pad)

        self.fig = Figure(figsize=(6.2, 3.2), dpi=100)
        self.fig.set_facecolor("#f8f8f8")
        self.ax = self.fig.add_subplot(111)
        self.ax.plot(D_GRID, C_GRID, color="#2563eb", linewidth=2, label="C(d)")
        self.ax.set_xlim(D_MIN, D_MAX)
        self.ax.set_xlabel("强化石等级 d")
        self.ax.set_ylabel("C(d), 单位 k")
        self.ax.set_title("C(d) 与推荐位置")
        self.ax.grid(True, alpha=0.3)
        self.ax.legend(loc="upper left", fontsize=8)

        self.canvas = FigureCanvasTkAgg(self.fig, master=plot_frame)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)

    def _init_plot(self) -> None:
        """曲线已在 __init__ 中绘制，此处仅刷新画布。"""
        self.fig.tight_layout()
        self.canvas.draw()

    def _clear_markers(self) -> None:
        """移除旧的水平/竖线标记。"""
        for artist in (self._hline, self._vline_rec):
            if artist is not None:
                artist.remove()
        self._hline = None
        self._vline_rec = None

    def _update_plot_markers(
        self,
        input_C: float,
        recommended_d: int,
    ) -> None:
        """只更新标记线，不重新计算 C_GRID。"""
        self._clear_markers()
        self._hline = self.ax.axhline(
            input_C, color="#dc2626", linestyle="--", linewidth=1.2, label=f"C={input_C:.4g}"
        )
        self._vline_rec = self.ax.axvline(
            recommended_d,
            color="#9333ea",
            linestyle="-.",
            linewidth=1.4,
            label=f"推荐 d={recommended_d}",
        )
        # 更新图例（去掉重复项）
        self.ax.legend(loc="upper left", fontsize=7)
        self.canvas.draw_idle()

    def _set_result(self, key: str, text: str) -> None:
        self.result_labels[key].config(text=text)

    def _on_calculate(self) -> None:
        raw = self.entry_c.get().strip()
        if not raw:
            messagebox.showwarning("输入错误", "请输入强化花费 C。")
            return

        try:
            input_C = float(raw)
        except ValueError:
            messagebox.showerror("输入错误", f"请输入有效数字，当前输入：{raw!r}")
            return

        if input_C < 0:
            messagebox.showwarning(
                "警告",
                "target_C < 0，已按模型边界处理（d_cont 取 1）。",
            )

        d_cont = solve_continuous_d(input_C)
        recommended_d = recommend_discrete_d(d_cont, input_C)
        p_rec = p_from_d(recommended_d)
        e_rec = E_at_d(recommended_d, input_C)

        self._set_result("input_c", f"{input_C:.6f}")
        self.lbl_d_highlight.config(text=str(recommended_d))
        self._set_result("p_rec", f"{p_rec:.6f}")
        self._set_result("e_rec", f"{e_rec:.6f}")
        self._set_result("model_c", f"{C_at_d(recommended_d):.6f}")

        self._update_plot_markers(input_C, recommended_d)


def main() -> None:
    root = tk.Tk()
    # Windows 下 ttk 主题
    try:
        style = ttk.Style(root)
        if "vista" in style.theme_names():
            style.theme_use("vista")
    except tk.TclError:
        pass

    StoneRecommenderApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
