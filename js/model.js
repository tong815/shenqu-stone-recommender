/**
 * 后期锚定指数模型
 * - 连续解 d_cont：由 C(d) = 输入 C 反解（C = p·f′ − f）
 * - 整数推荐：在 floor/ceil(d_cont) 上比较成功升级花费期望
 *   E(p) = (n(p) + c) / p，其中 n(p)=f(p) 为强化石单次费用，c 为输入的当前强化花费
 */

const D_MIN = 1;
const D_MAX = 9;
const ANCHOR_COST = 300;
const LN2_10 = 10 * Math.LN2;

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

/** 单次强化石费用 n(p)，与 f(p) 相同 */
function n(p) {
  return f(p);
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

/** 成功升级花费期望 E(p) = (n(p) + c) / p */
function E_success(p, c) {
  return (n(p) + c) / p;
}

function E_at_d(d, input_C) {
  const p = p_from_d(d);
  return E_success(p, input_C);
}

function level_switch_C(lower_d) {
  const upper_d = lower_d + 1;
  const p_lower = p_from_d(lower_d);
  const p_upper = p_from_d(upper_d);
  const f_lower = n(p_lower);
  const f_upper = n(p_upper);
  return (p_lower * f_upper - p_upper * f_lower) / (p_upper - p_lower);
}

function build_recommendation_ranges() {
  const ranges = [];
  let min_C = 0;

  for (let d = D_MIN; d <= D_MAX; d++) {
    const max_C = d < D_MAX ? level_switch_C(d) : Infinity;
    ranges.push({
      d,
      p: p_from_d(d),
      min_C,
      max_C,
      model_c: C_at_d(d),
    });
    min_C = max_C;
  }

  return ranges;
}

function find_recommendation_range(input_C, recommended_d) {
  return build_recommendation_ranges().find((range) => {
    if (range.d !== recommended_d) return false;
    if (range.d === D_MIN) return input_C <= range.max_C;
    if (range.d === D_MAX) return input_C > range.min_C;
    return input_C > range.min_C && input_C <= range.max_C;
  });
}

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

/** 在 floor/ceil 中选 E(p) 更小者（不是比 C(d)，避免退一法） */
function recommend_discrete_d(d_cont, input_C) {
  const candidates = discrete_candidates(d_cont);
  let bestD = candidates[0];
  let bestE = E_at_d(bestD, input_C);
  for (let i = 1; i < candidates.length; i++) {
    const d = candidates[i];
    const e = E_at_d(d, input_C);
    if (e < bestE) {
      bestD = d;
      bestE = e;
    }
  }
  return bestD;
}

function build_candidate_rows(d_cont, input_C) {
  const floorD = Math.floor(d_cont);
  const ceilD = Math.ceil(d_cont);
  return discrete_candidates(d_cont).map((d_int) => {
    let tag = "";
    if (floorD === ceilD) tag = "floor=ceil";
    else if (d_int === floorD) tag = "floor";
    else if (d_int === ceilD) tag = "ceil";
    const p = p_from_d(d_int);
    return {
      d: d_int,
      p,
      e_success: E_at_d(d_int, input_C),
      model_c: C_at_d(d_int),
      tag,
    };
  });
}

function computeRecommendation(input_C) {
  const d_cont = solve_continuous_d(input_C);
  const recommended_d = recommend_discrete_d(d_cont, input_C);
  const p_rec = p_from_d(recommended_d);
  const e_rec = E_at_d(recommended_d, input_C);
  const ranges = build_recommendation_ranges();
  return {
    input_C,
    d_cont,
    recommended_d,
    p_rec,
    e_rec,
    model_c_rec: C_at_d(recommended_d),
    candidates: build_candidate_rows(d_cont, input_C),
    ranges,
    current_range: find_recommendation_range(input_C, recommended_d),
  };
}
