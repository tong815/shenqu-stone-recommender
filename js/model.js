/**
 * 后期锚定指数模型
 * C(d) 即该等级下的期望指标；连续解 d_cont 由 C(d)=输入C 反解；
 * 整数推荐在 floor/ceil(d_cont) 中取期望 C(d) 更低者。
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

function f_prime(p) {
  return LN2_10 * f(p);
}

function C(p) {
  return f(p) * (LN2_10 * p - 1);
}

function C_at_d(d) {
  return C(p_from_d(d));
}

/** 等级 d 下的期望指标（即 C(d)） */
function expectation_at_d(d) {
  return C_at_d(d);
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

/**
 * 在 floor/ceil 候选中选期望更低的整数等级（不四舍五入）。
 */
function recommend_discrete_d(d_cont) {
  const candidates = discrete_candidates(d_cont);
  let bestD = candidates[0];
  let bestE = expectation_at_d(bestD);
  for (let i = 1; i < candidates.length; i++) {
    const d = candidates[i];
    const e = expectation_at_d(d);
    if (e < bestE) {
      bestD = d;
      bestE = e;
    }
  }
  return bestD;
}

function build_candidate_rows(d_cont) {
  const floorD = Math.floor(d_cont);
  const ceilD = Math.ceil(d_cont);
  return discrete_candidates(d_cont).map((d_int) => {
    let tag = "";
    if (floorD === ceilD) tag = "floor=ceil";
    else if (d_int === floorD) tag = "floor";
    else if (d_int === ceilD) tag = "ceil";
    return {
      d: d_int,
      p: p_from_d(d_int),
      expectation: expectation_at_d(d_int),
      tag,
    };
  });
}

function computeRecommendation(input_C) {
  const d_cont = solve_continuous_d(input_C);
  const recommended_d = recommend_discrete_d(d_cont);
  const p_rec = p_from_d(recommended_d);
  const c_rec = expectation_at_d(recommended_d);
  return {
    input_C,
    d_cont,
    recommended_d,
    p_rec,
    c_rec,
    error: c_rec - input_C,
    candidates: build_candidate_rows(d_cont),
  };
}
