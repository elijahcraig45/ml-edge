import type { CodingProblem } from "@/lib/types";

/** In-browser Python (Pyodide / numpy) coding problems for each Math for ML lesson.
 *  Each assertion string is executed as Python after the user's code runs.
 *  AssertionError → test failed; no exception → test passed.
 *  numpy is always available in the Pyodide environment.
 */

// ---------------------------------------------------------------------------
// Lesson 1 — Linear Algebra as a Modeling Language
// ---------------------------------------------------------------------------

const LESSON_1_PROBLEMS: CodingProblem[] = [
  {
    id: "math-l1-code-1",
    title: "Least Squares via Normal Equations",
    difficulty: "easy",
    prompt: `The **normal equations** solve the least squares problem by projecting the target vector onto the column space of X:

$$\\hat{b} = (X^T X)^{-1} X^T y$$

Rearranged for numerical stability:

$$(X^T X)\\, b = X^T y$$

Implement \`solve_least_squares(X, y)\` using \`np.linalg.solve\` to solve this system directly.

**Do not** use \`np.linalg.lstsq\`, \`np.linalg.pinv\`, or any fit method from a library.

\`\`\`
X — shape (n_samples, n_features)   feature matrix
y — shape (n_samples,)              target vector
returns b — shape (n_features,)     learned coefficients
\`\`\`

**Geometric insight:** the residual \`X @ b - y\` must be **orthogonal** to every column of X after solving. Verify this with the hidden test.`,
    starterCode: `import numpy as np

def solve_least_squares(X: np.ndarray, y: np.ndarray) -> np.ndarray:
    """
    Solve (X.T @ X) b = X.T @ y using np.linalg.solve.
    Return b with shape (n_features,).
    """
    # TODO: form the left-hand side and right-hand side, then solve
    pass`,
    testCases: [
      {
        label: "Perfect linear fit: X=[1,2,3] rows with bias, y=[2,4,6]",
        assertion: `import numpy as np
X = np.array([[1, 1], [2, 1], [3, 1]], dtype=float)
y = np.array([2.0, 4.0, 6.0])
b = solve_least_squares(X, y)
assert b.shape == (2,), f"Expected shape (2,), got {b.shape}"
assert abs(b[0] - 2.0) < 1e-8, f"Slope should be 2, got {b[0]}"
assert abs(b[1]) < 1e-8, f"Intercept should be 0, got {b[1]}"`,
      },
      {
        label: "Output shape matches n_features",
        assertion: `import numpy as np
rng = np.random.default_rng(0)
X = rng.standard_normal((20, 4))
y = rng.standard_normal(20)
b = solve_least_squares(X, y)
assert b.shape == (4,), f"Expected (4,) got {b.shape}"`,
      },
      {
        label: "Residual is orthogonal to every column of X (projection theorem)",
        assertion: `import numpy as np
rng = np.random.default_rng(1)
X = rng.standard_normal((30, 3))
y = rng.standard_normal(30)
b = solve_least_squares(X, y)
residual = X @ b - y
# X.T @ residual should be ~0 — the projection theorem
proj = X.T @ residual
assert np.allclose(proj, 0, atol=1e-8), f"Residual not orthogonal to X columns: {proj}"`,
        hidden: true,
      },
      {
        label: "Recovers known coefficients under noise",
        assertion: `import numpy as np
rng = np.random.default_rng(7)
true_b = np.array([3.0, -1.5, 0.5])
X = rng.standard_normal((100, 3))
y = X @ true_b + rng.standard_normal(100) * 0.01
b = solve_least_squares(X, y)
assert np.allclose(b, true_b, atol=0.05), f"Coefficients far from true: {b}"`,
        hidden: true,
      },
    ],
    hint: "Form `A = X.T @ X` (shape n_features × n_features) and `c = X.T @ y` (shape n_features). Then call `np.linalg.solve(A, c)`. The key insight from the lecture: the solution is the vector b such that the residual lands perpendicular to the feature subspace.",
    solution: `import numpy as np

def solve_least_squares(X: np.ndarray, y: np.ndarray) -> np.ndarray:
    A = X.T @ X
    c = X.T @ y
    return np.linalg.solve(A, c)`,
  },
  {
    id: "math-l1-code-2",
    title: "PCA from Scratch",
    difficulty: "medium",
    prompt: `Implement PCA using the covariance eigendecomposition — no \`sklearn\` or \`np.linalg.svd\` shortcuts.

\`\`\`
X — shape (n_samples, n_features)
n_components — how many principal directions to keep
\`\`\`

**Steps:**
1. **Center** X by subtracting column means
2. Compute the **covariance matrix** \`C = X_c.T @ X_c / (n - 1)\`
3. Compute eigenvectors/values with \`np.linalg.eigh\` (returns them in ascending order)
4. **Sort descending** by eigenvalue — largest variance direction first
5. Keep the top \`n_components\` eigenvectors as rows of \`components\`
6. **Project**: \`projected = X_c @ components.T\`

Return \`(components, projected)\`.

**Geometric insight:** components are the directions of maximum variance in the data cloud. The projected coordinates are the data re-expressed in those directions.`,
    starterCode: `import numpy as np

def pca(X: np.ndarray, n_components: int):
    """
    Returns:
        components  — shape (n_components, n_features), orthonormal rows
        projected   — shape (n_samples, n_components)
    """
    n_samples, n_features = X.shape

    # Step 1: center X
    mean = None  # TODO: X.mean(axis=0)
    X_c = None   # TODO: X - mean

    # Step 2: covariance matrix
    C = None     # TODO: X_c.T @ X_c / (n_samples - 1)

    # Step 3: eigenvectors (np.linalg.eigh returns ascending order)
    eigenvalues, eigenvectors = None, None  # TODO

    # Step 4: sort descending
    # np.linalg.eigh returns columns as eigenvectors; reverse to descending
    idx = None   # TODO: np.argsort(eigenvalues)[::-1]
    eigenvectors = None  # TODO: reorder columns

    # Step 5: top n_components eigenvectors as rows
    components = None    # TODO: eigenvectors[:, :n_components].T

    # Step 6: project
    projected = None     # TODO: X_c @ components.T

    return components, projected`,
    testCases: [
      {
        label: "Output shapes are correct",
        assertion: `import numpy as np
rng = np.random.default_rng(0)
X = rng.standard_normal((50, 4))
comps, proj = pca(X, 2)
assert comps.shape == (2, 4), f"components shape wrong: {comps.shape}"
assert proj.shape == (50, 2), f"projected shape wrong: {proj.shape}"`,
      },
      {
        label: "Components are orthonormal (C @ C.T ≈ I)",
        assertion: `import numpy as np
rng = np.random.default_rng(1)
X = rng.standard_normal((80, 5))
comps, _ = pca(X, 3)
gram = comps @ comps.T
assert np.allclose(gram, np.eye(3), atol=1e-8), f"Components not orthonormal:\\n{gram}"`,
      },
      {
        label: "First component aligns with dominant direction in data",
        assertion: `import numpy as np
rng = np.random.default_rng(2)
# Data mostly along x-axis with tiny y noise
x_vals = rng.standard_normal(200) * 10
y_vals = rng.standard_normal(200) * 0.1
X = np.column_stack([x_vals, y_vals])
comps, _ = pca(X, 1)
# First component should be ~[1,0] or ~[-1,0]
alignment = abs(comps[0, 0])
assert alignment > 0.999, f"First component not aligned with x-axis: {comps[0]}"`,
      },
      {
        label: "Variance along PC1 >= variance along PC2",
        assertion: `import numpy as np
rng = np.random.default_rng(3)
X = rng.standard_normal((100, 4))
X[:, 0] *= 5  # inflate first dimension
_, proj = pca(X, 2)
var1 = np.var(proj[:, 0])
var2 = np.var(proj[:, 1])
assert var1 >= var2, f"PC1 variance ({var1:.3f}) should be >= PC2 variance ({var2:.3f})"`,
        hidden: true,
      },
    ],
    hint: "The trickiest part is `np.linalg.eigh`: it returns eigenvalues in *ascending* order and eigenvectors as *columns* (not rows). Use `np.argsort(eigenvalues)[::-1]` to get descending order, then reorder `eigenvectors` columns accordingly before taking the top n_components as rows of `components`.",
    solution: `import numpy as np

def pca(X: np.ndarray, n_components: int):
    n_samples, _ = X.shape
    mean = X.mean(axis=0)
    X_c = X - mean
    C = X_c.T @ X_c / (n_samples - 1)
    eigenvalues, eigenvectors = np.linalg.eigh(C)
    idx = np.argsort(eigenvalues)[::-1]
    eigenvectors = eigenvectors[:, idx]
    components = eigenvectors[:, :n_components].T
    projected = X_c @ components.T
    return components, projected`,
  },
];

// ---------------------------------------------------------------------------
// Lesson 2 — Gradients, Chain Rule, and Optimization Surfaces
// ---------------------------------------------------------------------------

const LESSON_2_PROBLEMS: CodingProblem[] = [
  {
    id: "math-l2-code-1",
    title: "Numerical Gradient Check",
    difficulty: "easy",
    prompt: `A **numerical gradient check** is the standard sanity-test for any analytical gradient implementation. It uses the **central difference formula**:

$$\\frac{\\partial f}{\\partial x_i} \\approx \\frac{f(x + h\\, e_i) - f(x - h\\, e_i)}{2h}$$

where $e_i$ is the unit vector along dimension $i$ and $h$ is a small step size.

Implement \`numerical_gradient(f, x, h)\` that returns the full gradient vector at point \`x\`.

\`\`\`
f  — scalar function: np.ndarray -> float
x  — point to evaluate at, shape (n,)
h  — step size (default 1e-5)
returns grad — shape (n,)
\`\`\`

**Why this matters:** before trusting autograd or your manual backprop, a gradient check is how you verify correctness. A mismatch signals a bug in your analytical computation.`,
    starterCode: `import numpy as np

def numerical_gradient(f, x: np.ndarray, h: float = 1e-5) -> np.ndarray:
    """
    Compute the gradient of scalar function f at point x
    using the central difference formula.
    """
    grad = np.zeros_like(x, dtype=float)
    # TODO: for each index i:
    #   1. create x_plus  = x with x[i] increased by h
    #   2. create x_minus = x with x[i] decreased by h
    #   3. grad[i] = (f(x_plus) - f(x_minus)) / (2 * h)
    return grad`,
    testCases: [
      {
        label: "f(x) = x[0]^2 + 3*x[1] at x=[2,1] → grad=[4,3]",
        assertion: `import numpy as np
f = lambda x: x[0]**2 + 3*x[1]
x = np.array([2.0, 1.0])
grad = numerical_gradient(f, x)
assert np.allclose(grad, [4.0, 3.0], atol=1e-6), f"Got {grad}"`,
      },
      {
        label: "f(x) = sum(x^2) → grad ≈ 2*x",
        assertion: `import numpy as np
f = lambda x: np.sum(x**2)
x = np.array([1.0, -2.0, 3.0])
grad = numerical_gradient(f, x)
assert np.allclose(grad, 2*x, atol=1e-6), f"Got {grad}"`,
      },
      {
        label: "f(x) = x[0]*x[1] at [3,2] → grad=[2,3]",
        assertion: `import numpy as np
f = lambda x: x[0] * x[1]
x = np.array([3.0, 2.0])
grad = numerical_gradient(f, x)
assert np.allclose(grad, [2.0, 3.0], atol=1e-5), f"Got {grad}"`,
      },
      {
        label: "Original x is not mutated",
        assertion: `import numpy as np
f = lambda x: np.sum(x**2)
x = np.array([1.0, 2.0, 3.0])
x_copy = x.copy()
numerical_gradient(f, x)
assert np.array_equal(x, x_copy), "x was mutated during gradient computation"`,
        hidden: true,
      },
      {
        label: "5D function: f(x) = x @ A @ x, grad = (A + A.T) @ x",
        assertion: `import numpy as np
rng = np.random.default_rng(42)
A = rng.standard_normal((5, 5))
f = lambda x: x @ A @ x
x = rng.standard_normal(5)
grad_num = numerical_gradient(f, x, h=1e-5)
grad_true = (A + A.T) @ x
assert np.allclose(grad_num, grad_true, atol=1e-4), f"Numerical: {grad_num}\\nTrue: {grad_true}"`,
        hidden: true,
      },
    ],
    hint: "Make sure to copy x before perturbing: `x_plus = x.copy(); x_plus[i] += h`. If you mutate x in-place without copying, all subsequent evaluations will be wrong. Use a fresh copy for x_minus too.",
    solution: `import numpy as np

def numerical_gradient(f, x: np.ndarray, h: float = 1e-5) -> np.ndarray:
    grad = np.zeros_like(x, dtype=float)
    for i in range(len(x)):
        x_plus = x.copy()
        x_plus[i] += h
        x_minus = x.copy()
        x_minus[i] -= h
        grad[i] = (f(x_plus) - f(x_minus)) / (2 * h)
    return grad`,
  },
  {
    id: "math-l2-code-2",
    title: "MSE Gradient via Chain Rule",
    difficulty: "medium",
    prompt: `Implement the gradient of **mean squared error** with respect to weights, manually applying the chain rule — no autograd.

Given:
- \`W\` — weight vector, shape \`(n_features,)\`
- \`X\` — data matrix, shape \`(n_samples, n_features)\`
- \`y\` — targets, shape \`(n_samples,)\`

The loss is:
$$L = \\frac{1}{n} \\sum_i (X_i \\cdot W - y_i)^2$$

**Chain rule unrolled:**
1. **Forward:** \`residuals = X @ W - y\` — shape \`(n_samples,)\`
2. **Outer derivative:** \`dL/d_residuals = 2 * residuals / n\`
3. **Chain back through the linear layer:** \`dL/dW = X.T @ (dL/d_residuals)\`

Return \`dL/dW\` with shape \`(n_features,)\`.

**Why this matters:** this exact three-step pattern — forward computation, outer derivative, chain back — is what backprop does at every layer.`,
    starterCode: `import numpy as np

def mse_gradient(W: np.ndarray, X: np.ndarray, y: np.ndarray) -> np.ndarray:
    """
    Compute dL/dW for L = mean((X @ W - y)^2).
    Apply the chain rule in three explicit steps.
    """
    n = len(y)

    # Step 1: forward — compute residuals
    residuals = None  # TODO: X @ W - y

    # Step 2: outer derivative
    d_residuals = None  # TODO: 2 * residuals / n

    # Step 3: chain back through X @ W
    dW = None  # TODO: X.T @ d_residuals

    return dW`,
    testCases: [
      {
        label: "At the optimum, gradient is ~zero",
        assertion: `import numpy as np
rng = np.random.default_rng(0)
X = rng.standard_normal((50, 3))
true_W = np.array([2.0, -1.0, 0.5])
y = X @ true_W   # perfect fit, no noise
# At the least-squares solution the gradient vanishes
W_opt = np.linalg.solve(X.T @ X, X.T @ y)
grad = mse_gradient(W_opt, X, y)
assert np.allclose(grad, 0, atol=1e-8), f"Gradient at optimum should be ~0, got {grad}"`,
      },
      {
        label: "Output shape matches W",
        assertion: `import numpy as np
rng = np.random.default_rng(1)
X = rng.standard_normal((30, 5))
y = rng.standard_normal(30)
W = rng.standard_normal(5)
grad = mse_gradient(W, X, y)
assert grad.shape == (5,), f"Expected (5,), got {grad.shape}"`,
      },
      {
        label: "Matches numerical gradient",
        assertion: `import numpy as np

def numerical_gradient(f, x, h=1e-5):
    grad = np.zeros_like(x, dtype=float)
    for i in range(len(x)):
        xp = x.copy(); xp[i] += h
        xm = x.copy(); xm[i] -= h
        grad[i] = (f(xp) - f(xm)) / (2*h)
    return grad

rng = np.random.default_rng(2)
X = rng.standard_normal((20, 3))
y = rng.standard_normal(20)
W = rng.standard_normal(3)

f = lambda w: np.mean((X @ w - y)**2)
grad_num = numerical_gradient(f, W)
grad_analytic = mse_gradient(W, X, y)
assert np.allclose(grad_analytic, grad_num, atol=1e-5), f"Analytic: {grad_analytic}\\nNumerical: {grad_num}"`,
        hidden: true,
      },
      {
        label: "Gradient direction points toward increasing loss",
        assertion: `import numpy as np
rng = np.random.default_rng(3)
X = rng.standard_normal((40, 4))
y = rng.standard_normal(40)
W = rng.standard_normal(4)
grad = mse_gradient(W, X, y)
loss_before = np.mean((X @ W - y)**2)
# Taking a small step in the gradient direction should increase loss
W_up = W + 0.001 * grad
loss_after = np.mean((X @ W_up - y)**2)
assert loss_after > loss_before - 1e-6, "Step in gradient direction should increase loss"`,
        hidden: true,
      },
    ],
    hint: "The three steps map directly to the chain rule: (1) `residuals = X @ W - y` is the composition output, (2) `2 * residuals / n` is the outer derivative d_loss/d_residuals, (3) `X.T @ d_residuals` chains back through the linear map. At the minimum, the residual vector is orthogonal to every column of X — so X.T @ residuals = 0, and the gradient vanishes.",
    solution: `import numpy as np

def mse_gradient(W: np.ndarray, X: np.ndarray, y: np.ndarray) -> np.ndarray:
    n = len(y)
    residuals = X @ W - y
    d_residuals = 2 * residuals / n
    dW = X.T @ d_residuals
    return dW`,
  },
];

// ---------------------------------------------------------------------------
// Lesson 3 — Probability, Estimation, and Bias-Variance
// ---------------------------------------------------------------------------

const LESSON_3_PROBLEMS: CodingProblem[] = [
  {
    id: "math-l3-code-1",
    title: "Bootstrap Confidence Interval",
    difficulty: "easy",
    prompt: `Implement a **bootstrap confidence interval** for the mean of a dataset.

Bootstrap resampling is the simplest way to quantify estimation uncertainty without distributional assumptions: draw many samples with replacement, compute your statistic on each, and read off the percentile bounds.

\`\`\`
data         — 1D array of observations
n_bootstrap  — number of bootstrap samples (default 2000)
confidence   — confidence level, e.g. 0.95 for a 95% CI
seed         — random seed for reproducibility
\`\`\`

**Steps:**
1. For each of \`n_bootstrap\` iterations, draw \`len(data)\` samples **with replacement** using \`rng.choice\`
2. Compute the **mean** of each bootstrap sample
3. Return \`(lower, upper)\` percentile bounds:
   - \`lower\` = \`(1 - confidence) / 2\` percentile
   - \`upper\` = \`1 - (1 - confidence) / 2\` percentile

Use \`np.percentile\`.`,
    starterCode: `import numpy as np

def bootstrap_ci(
    data: np.ndarray,
    n_bootstrap: int = 2000,
    confidence: float = 0.95,
    seed: int = 42,
) -> tuple:
    """
    Returns (lower, upper) confidence interval bounds for the mean of data.
    """
    rng = np.random.default_rng(seed)
    n = len(data)
    boot_means = []

    # TODO: for each bootstrap iteration:
    #   1. draw n samples with replacement: rng.choice(data, size=n, replace=True)
    #   2. compute the mean of the sample
    #   3. append to boot_means

    boot_means = np.array(boot_means)

    # TODO: compute lower and upper percentile bounds
    alpha = 1 - confidence
    lower = None  # TODO: np.percentile(boot_means, ...)
    upper = None  # TODO: np.percentile(boot_means, ...)

    return lower, upper`,
    testCases: [
      {
        label: "Returns a tuple of two floats with lower < upper",
        assertion: `import numpy as np
rng = np.random.default_rng(0)
data = rng.standard_normal(100)
lo, hi = bootstrap_ci(data)
assert isinstance(lo, float) or isinstance(lo, np.floating), "lower must be a number"
assert isinstance(hi, float) or isinstance(hi, np.floating), "upper must be a number"
assert lo < hi, f"lower ({lo:.4f}) must be less than upper ({hi:.4f})"`,
      },
      {
        label: "True mean lies within 95% CI on seeded normal data",
        assertion: `import numpy as np
rng = np.random.default_rng(42)
data = rng.normal(loc=5.0, scale=2.0, size=200)
lo, hi = bootstrap_ci(data, seed=42)
true_mean = 5.0
assert lo <= true_mean <= hi, f"True mean {true_mean} not in CI ({lo:.4f}, {hi:.4f})"`,
      },
      {
        label: "99% CI is wider than 95% CI",
        assertion: `import numpy as np
rng = np.random.default_rng(10)
data = rng.standard_normal(150)
lo95, hi95 = bootstrap_ci(data, confidence=0.95, seed=10)
lo99, hi99 = bootstrap_ci(data, confidence=0.99, seed=10)
width95 = hi95 - lo95
width99 = hi99 - lo99
assert width99 > width95, f"99% CI ({width99:.4f}) should be wider than 95% CI ({width95:.4f})"`,
      },
      {
        label: "Larger sample produces narrower CI (central limit theorem)",
        assertion: `import numpy as np
rng = np.random.default_rng(5)
small = rng.standard_normal(20)
large = rng.standard_normal(500)
lo_s, hi_s = bootstrap_ci(small, seed=5)
lo_l, hi_l = bootstrap_ci(large, seed=5)
width_small = hi_s - lo_s
width_large = hi_l - lo_l
assert width_small > width_large, f"Small CI ({width_small:.4f}) should be wider than large CI ({width_large:.4f})"`,
        hidden: true,
      },
    ],
    hint: "The percentile formula: for a 95% CI, `alpha = 0.05`, so lower is the 2.5th percentile and upper is the 97.5th. In general: `lower = np.percentile(boot_means, 100 * alpha/2)` and `upper = np.percentile(boot_means, 100 * (1 - alpha/2))`.",
    solution: `import numpy as np

def bootstrap_ci(
    data: np.ndarray,
    n_bootstrap: int = 2000,
    confidence: float = 0.95,
    seed: int = 42,
) -> tuple:
    rng = np.random.default_rng(seed)
    n = len(data)
    boot_means = np.array([
        rng.choice(data, size=n, replace=True).mean()
        for _ in range(n_bootstrap)
    ])
    alpha = 1 - confidence
    lower = float(np.percentile(boot_means, 100 * alpha / 2))
    upper = float(np.percentile(boot_means, 100 * (1 - alpha / 2)))
    return lower, upper`,
  },
  {
    id: "math-l3-code-2",
    title: "Empirical Bias-Variance Decomposition",
    difficulty: "medium",
    prompt: `The **bias-variance decomposition** says that for a fixed test point:

$$\\text{MSE} = \\text{Bias}^2 + \\text{Variance}$$

where:
- $\\text{Bias}^2 = (\\bar{y}_{\\text{pred}} - y_{\\text{true}})^2$ — how far the average prediction is from the truth
- $\\text{Variance} = \\frac{1}{M}\\sum_i (y_i^{\\text{pred}} - \\bar{y}_{\\text{pred}})^2$ — how spread out predictions are around their own mean

Implement \`bias_variance(predictions, true_value)\` that computes both components.

\`\`\`
predictions — 1D array of predictions from M different model runs (or bootstrap models)
true_value  — the scalar ground truth for this test point
\`\`\`

Return \`(bias_squared, variance)\` as floats.

**Sanity check:** \`bias_squared + variance\` should equal \`mean((predictions - true_value)^2)\` — the expected MSE.`,
    starterCode: `import numpy as np

def bias_variance(predictions: np.ndarray, true_value: float) -> tuple:
    """
    Returns (bias_squared, variance).
    bias_squared = (mean(predictions) - true_value) ** 2
    variance     = mean((predictions - mean(predictions)) ** 2)
    """
    # TODO: compute mean prediction
    mean_pred = None

    # TODO: compute bias squared
    bias_sq = None

    # TODO: compute variance of predictions
    variance = None

    return bias_sq, variance`,
    testCases: [
      {
        label: "Perfect unbiased predictor: bias_sq=0, variance=0",
        assertion: `import numpy as np
preds = np.array([3.0, 3.0, 3.0, 3.0])
bs, var = bias_variance(preds, true_value=3.0)
assert abs(bs) < 1e-10, f"bias_sq should be 0, got {bs}"
assert abs(var) < 1e-10, f"variance should be 0, got {var}"`,
      },
      {
        label: "Purely biased predictor: bias_sq=4, variance=0",
        assertion: `import numpy as np
preds = np.array([5.0, 5.0, 5.0, 5.0])
bs, var = bias_variance(preds, true_value=3.0)
assert abs(bs - 4.0) < 1e-10, f"bias_sq should be 4, got {bs}"
assert abs(var) < 1e-10, f"variance should be 0, got {var}"`,
      },
      {
        label: "High variance, zero bias: bias_sq≈0, variance>0",
        assertion: `import numpy as np
# Symmetric around true_value=0 → unbiased, but spread
preds = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])
bs, var = bias_variance(preds, true_value=0.0)
assert abs(bs) < 1e-10, f"bias_sq should be ~0, got {bs}"
assert var > 0.5, f"variance should be > 0.5, got {var}"`,
      },
      {
        label: "bias_sq + variance == mean MSE (decomposition identity)",
        assertion: `import numpy as np
rng = np.random.default_rng(42)
preds = rng.normal(loc=2.5, scale=1.0, size=1000)
true_val = 2.0
bs, var = bias_variance(preds, true_val)
mse = np.mean((preds - true_val)**2)
assert abs(bs + var - mse) < 1e-8, f"Decomposition fails: {bs:.4f} + {var:.4f} = {bs+var:.4f} != {mse:.4f}"`,
        hidden: true,
      },
    ],
    hint: "The identity `bias_squared + variance = mean((predictions - true_value)^2)` is a good sanity check. If it fails, you likely mixed up what the variance is computed *around* — it should be the mean prediction, not the true value.",
    solution: `import numpy as np

def bias_variance(predictions: np.ndarray, true_value: float) -> tuple:
    mean_pred = np.mean(predictions)
    bias_sq = float((mean_pred - true_value) ** 2)
    variance = float(np.mean((predictions - mean_pred) ** 2))
    return bias_sq, variance`,
  },
];

// ---------------------------------------------------------------------------
// Lesson 4 — Convexity, Constraints, and Optimization Honesty
// ---------------------------------------------------------------------------

const LESSON_4_PROBLEMS: CodingProblem[] = [
  {
    id: "math-l4-code-1",
    title: "Gradient Descent from Scratch",
    difficulty: "easy",
    prompt: `Implement the **gradient descent update loop** — the core algorithm under nearly every neural network optimizer.

\`\`\`
grad_f   — function: np.ndarray -> np.ndarray  (gradient at x)
x0       — starting point, shape (n,)
lr       — learning rate (step size)
n_steps  — number of update steps
\`\`\`

**Update rule** (applied \`n_steps\` times):
$$x_{t+1} = x_t - \\alpha \\cdot \\nabla f(x_t)$$

Return the final \`x\` after all steps.

**Why this matters:** on a **convex** objective like a quadratic, gradient descent is guaranteed to converge. The learning rate controls how fast you approach the minimum — too large and you overshoot, too small and you crawl. This is the geometric intuition from the lecture on curvature and step trust.`,
    starterCode: `import numpy as np

def gradient_descent(
    grad_f,           # gradient function: x -> gradient at x
    x0: np.ndarray,   # starting point
    lr: float,        # learning rate
    n_steps: int,     # number of update steps
) -> np.ndarray:
    """
    Run gradient descent for n_steps, return final x.
    Update rule: x = x - lr * grad_f(x)
    """
    x = x0.copy().astype(float)
    # TODO: loop n_steps times, applying the update rule
    return x`,
    testCases: [
      {
        label: "Converges to minimum [3, -1] of (x0-3)^2 + (x1+1)^2",
        assertion: `import numpy as np
grad_f = lambda x: np.array([2*(x[0]-3), 2*(x[1]+1)])
result = gradient_descent(grad_f, x0=np.array([0.0, 0.0]), lr=0.1, n_steps=200)
assert np.allclose(result, [3.0, -1.0], atol=1e-4), f"Got {result}, expected [3, -1]"`,
      },
      {
        label: "1D quadratic: converges to x=5 from x=0",
        assertion: `import numpy as np
# f(x) = (x - 5)^2, minimum at x=5
grad_f = lambda x: 2 * (x - 5)
result = gradient_descent(grad_f, x0=np.array([0.0]), lr=0.1, n_steps=100)
assert abs(result[0] - 5.0) < 0.01, f"Expected ~5, got {result[0]}"`,
      },
      {
        label: "Output shape matches x0",
        assertion: `import numpy as np
grad_f = lambda x: 2 * x
result = gradient_descent(grad_f, x0=np.zeros(6), lr=0.01, n_steps=10)
assert result.shape == (6,), f"Expected shape (6,), got {result.shape}"`,
      },
      {
        label: "Loss decreases monotonically on strongly convex objective",
        assertion: `import numpy as np
# f(x) = ||x||^2, minimum at origin; lr=0.1 is in the stable zone
grad_f = lambda x: 2 * x
x0 = np.array([5.0, -3.0, 2.0])
x = x0.copy().astype(float)
prev_loss = np.sum(x**2)
for _ in range(50):
    x = x - 0.1 * grad_f(x)
    curr_loss = np.sum(x**2)
    assert curr_loss <= prev_loss + 1e-10, f"Loss increased: {prev_loss:.6f} -> {curr_loss:.6f}"
    prev_loss = curr_loss`,
        hidden: true,
      },
    ],
    hint: "The loop body is a single line: `x = x - lr * grad_f(x)`. Make sure to work on the copy of x0, not mutate the original. On a convex quadratic like `(x-c)^2`, any learning rate `lr < 1 / (2 * curvature)` will converge — for `2*(x-c)` the curvature is 2, so `lr < 0.5` is safe.",
    solution: `import numpy as np

def gradient_descent(grad_f, x0: np.ndarray, lr: float, n_steps: int) -> np.ndarray:
    x = x0.copy().astype(float)
    for _ in range(n_steps):
        x = x - lr * grad_f(x)
    return x`,
  },
  {
    id: "math-l4-code-2",
    title: "Ridge Regression — Constrained Objective",
    difficulty: "medium",
    prompt: `**Ridge regression** is L2-regularized least squares — the canonical example of a **constrained objective** turned into a **penalized objective** via the Lagrangian approach:

$$\\min_w \\|Xw - y\\|^2 + \\lambda \\|w\\|^2$$

The $\\lambda \\|w\\|^2$ term is the Lagrangian penalty that enforces a soft norm constraint on the weights. As $\\lambda$ grows, weights are pushed toward zero.

This has a clean analytic solution:

$$w^* = (X^T X + \\lambda I)^{-1} X^T y$$

Rearranged for \`np.linalg.solve\`:

$$(X^T X + \\lambda I)\\, w = X^T y$$

Implement \`ridge_regression(X, y, lam)\` using \`np.linalg.solve\`.

\`\`\`
X    — shape (n_samples, n_features)
y    — shape (n_samples,)
lam  — regularization strength (λ ≥ 0)
\`\`\`

**Constraint insight:** as \`lam → 0\` the solution approaches plain least squares; as \`lam → ∞\` the solution approaches **zero**. This is the Lagrangian tradeoff between fit and constraint satisfaction made explicit.`,
    starterCode: `import numpy as np

def ridge_regression(X: np.ndarray, y: np.ndarray, lam: float) -> np.ndarray:
    """
    Solve (X.T @ X + lam * I) w = X.T @ y using np.linalg.solve.
    Return w* with shape (n_features,).
    """
    n_features = X.shape[1]

    # TODO: form the regularized left-hand side (X.T @ X + lam * identity)
    A = None

    # TODO: form the right-hand side
    c = None

    # TODO: solve the system
    return None`,
    testCases: [
      {
        label: "At lam=0, matches plain least squares solution",
        assertion: `import numpy as np
rng = np.random.default_rng(0)
X = rng.standard_normal((50, 3))
y = rng.standard_normal(50)
w_ridge = ridge_regression(X, y, lam=0.0)
w_ols = np.linalg.lstsq(X, y, rcond=None)[0]
assert np.allclose(w_ridge, w_ols, atol=1e-8), f"Ridge at lam=0 should match OLS.\\nRidge: {w_ridge}\\nOLS: {w_ols}"`,
      },
      {
        label: "Output shape is (n_features,)",
        assertion: `import numpy as np
rng = np.random.default_rng(1)
X = rng.standard_normal((30, 5))
y = rng.standard_normal(30)
w = ridge_regression(X, y, lam=1.0)
assert w.shape == (5,), f"Expected (5,), got {w.shape}"`,
      },
      {
        label: "Larger lambda shrinks weights toward zero",
        assertion: `import numpy as np
rng = np.random.default_rng(2)
X = rng.standard_normal((40, 4))
y = rng.standard_normal(40)
w_small = ridge_regression(X, y, lam=0.01)
w_large = ridge_regression(X, y, lam=1000.0)
norm_small = np.linalg.norm(w_small)
norm_large = np.linalg.norm(w_large)
assert norm_large < norm_small, f"Large lambda should shrink weights: ||w_small||={norm_small:.4f}, ||w_large||={norm_large:.4f}"`,
      },
      {
        label: "Satisfies normal equations: (X.T@X + lam*I)@w ≈ X.T@y",
        assertion: `import numpy as np
rng = np.random.default_rng(3)
X = rng.standard_normal((60, 4))
y = rng.standard_normal(60)
lam = 2.5
w = ridge_regression(X, y, lam=lam)
I = np.eye(4)
lhs = (X.T @ X + lam * I) @ w
rhs = X.T @ y
assert np.allclose(lhs, rhs, atol=1e-8), f"Normal equations not satisfied.\\nLHS: {lhs}\\nRHS: {rhs}"`,
        hidden: true,
      },
    ],
    hint: "The key line is `A = X.T @ X + lam * np.eye(n_features)`. The `lam * I` term is exactly the Lagrangian penalty contribution to the gradient — it pushes the solution toward smaller weights. At `lam=0` this disappears and you recover the plain normal equations.",
    solution: `import numpy as np

def ridge_regression(X: np.ndarray, y: np.ndarray, lam: float) -> np.ndarray:
    n_features = X.shape[1]
    A = X.T @ X + lam * np.eye(n_features)
    c = X.T @ y
    return np.linalg.solve(A, c)`,
  },
];

// ---------------------------------------------------------------------------

export const MATH_CODING_PROBLEMS: Record<string, CodingProblem[]> = {
  // New 13-lesson structure
  "math-lesson-3": [],                             // NumPy warmup lab — problems embedded in tutorialSteps
  "math-lesson-5": [LESSON_1_PROBLEMS[0]],         // Least Squares via Normal Equations
  "math-lesson-7": [LESSON_1_PROBLEMS[1]],         // PCA from Scratch
  "math-lesson-9": LESSON_2_PROBLEMS,              // Numerical Gradient Check + MSE Gradient
  "math-lesson-11": LESSON_3_PROBLEMS,             // Bootstrap CI + Bias-Variance Decomposition
  "math-lesson-13": LESSON_4_PROBLEMS,             // Gradient Descent + Ridge Regression
  // Legacy keys for backward compatibility
  "math-foundations-lesson-1": LESSON_1_PROBLEMS,
  "math-foundations-lesson-2": LESSON_2_PROBLEMS,
  "math-foundations-lesson-3": LESSON_3_PROBLEMS,
  "math-foundations-lesson-4": LESSON_4_PROBLEMS,
};
