/**
 * 后期锚定指数模型（与桌面版 calc_C.py 一致）
 * p = (d + 1) / 10
 * f(p) = 300 * 1024^(p - 1)
 * C(d) = f(p) * (10*ln(2)*p - 1)
 */

const D_MIN = 1;
const D_MAX = 9;
const ANCHOR_COST = 300;
const LN2_10 = 10 * Math.LN2;

/** 预计算 C(d) 曲线（启动时只算一次） */
const D_GRID = [];
const C_GRID = [];
for (let i = 0; i < 500; i++) {
  const d = D_MIN + ((D_MAX - D_MIN) * i) / (500 - 1);
  D_GRID.push(d);
  C_GRID.push(C_at_d(d));
}

function p_from_d(d) {
  return (d + 1) / 10;
}

function f(p) {
  return ANCHOR_COST * Math.pow(1024, p - 1);
}

function f_prime(p) {
  return LN2_10 * f(p);
}

function C(p) {
  return f(p) * (LN2_10 * p - 1);
}

function C_at_d(d) {
  return C(p_from_d(d));
}

/** 单调递增，二分法求 C(d) = target_C 的连续解 */
function solve_continuous_d(target_C) {
  const cLo = C_at_d(D_MIN);
  const cHi = C_at_d(D_MAX);

  if (target_C <= cLo) return D_MIN;
  if (target_C >= cHi) return D_MAX;

  let lo = D_MIN;
  let hi = D_MAX;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const cm = C_at_d(mid) - target_C;
    if (Math.abs(cm) < 1e-10) return mid;
    if (cm < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function discrete_candidates(d_cont) {
  const raw = new Set([Math.floor(d_cont), Math.ceil(d_cont)]);
  return [...raw]
    .map((x) => Math.min(D_MAX, Math.max(D_MIN, x)))
    .sort((a, b) => a - b)
    .filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
}

function recommend_discrete_d(d_cont, target_C) {
  const candidates = discrete_candidates(d_cont);
  let bestD = candidates[0];
  let bestAbs = Math.abs(C_at_d(bestD) - target_C);
  for (let i = 1; i < candidates.length; i++) {
    const d = candidates[i];
    const err = Math.abs(C_at_d(d) - target_C);
    if (err < bestAbs) {
      bestD = d;
      bestAbs = err;
    }
  }
  return bestD;
}

function computeRecommendation(input_C) {
  const d_cont = solve_continuous_d(input_C);
  const recommended_d = recommend_discrete_d(d_cont, input_C);
  const p_rec = p_from_d(recommended_d);
  const c_rec = C_at_d(recommended_d);
  return {
    input_C,
    d_cont,
    recommended_d,
    p_rec,
    c_rec,
    error: c_rec - input_C,
  };
}
