import { Matrix } from "ml-matrix";

const axisIndex = { x: 0, y: 1, z: 2 };

// `endMatrix` is a flat 4x4 array in row-major order;
// the linear part sits at indices 0,1,2 / 4,5,6 / 8,9,10
export function from4x4(arr) {
	return new Matrix([
		[arr[0], arr[1], arr[2]],
		[arr[4], arr[5], arr[6]],
		[arr[8], arr[9], arr[10]]
	]);
}

export function to4x4(m) {
	return [
		m.get(0, 0), m.get(0, 1), m.get(0, 2), 0,
		m.get(1, 0), m.get(1, 1), m.get(1, 2), 0,
		m.get(2, 0), m.get(2, 1), m.get(2, 2), 0,
		0, 0, 0, 1
	];
}

export function rotationMatrix(axis, radians) {
	const c = Math.cos(radians);
	const s = Math.sin(radians);

	if (axis === "x") {
		return new Matrix([
			[1, 0, 0],
			[0, c, -s],
			[0, s, c]
		]);
	}
	if (axis === "y") {
		return new Matrix([
			[c, 0, s],
			[0, 1, 0],
			[-s, 0, c]
		]);
	}
	return new Matrix([
		[c, -s, 0],
		[s, c, 0],
		[0, 0, 1]
	]);
}

// Diagonal matrix with `k` on the selected axes, 1 elsewhere
export function scaleMatrix(axes, k) {
	const diag = [1, 1, 1];
	axes.forEach((axis) => (diag[axisIndex[axis]] = k));
	return Matrix.diag(diag);
}

// Flips the coordinates of the selected axes
export function reflectMatrix(axes) {
	return scaleMatrix(axes, -1);
}

// Transform at fraction `t` (0 to 1) of the way through, so the animation
// sweeps through the parameter (angle, scale) instead of the matrix entries
export function makeTransform(tool, axes, magnitude, t = 1) {
	if (tool === "rotate") {
		return rotationMatrix(axes[0], magnitude * (Math.PI / 180) * t);
	}
	if (tool === "scale") {
		return scaleMatrix(axes, 1 + (magnitude - 1) * t);
	}
	if (tool === "reflect") {
		// Passes through 0, flattening space onto the mirror plane mid-flip
		return scaleMatrix(axes, 1 - 2 * t);
	}
	return Matrix.eye(3);
}

// Matrix paths for scroll-driven animations:
// functions mapping progress `t` (0 to 1) to a flat 4x4 `endMatrix` array

export function diag4(x, y, z = 1) {
	return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}

export function rotation4(axis, degrees) {
	return to4x4(rotationMatrix(axis, degrees * (Math.PI / 180)));
}

export function lerpPath(from, to) {
	return (t) => from.map((a, i) => a + (to[i] - a) * t);
}

// Sweeps the angle (rather than the matrix entries) so the rotation stays rigid
export function rotatePath(axis, fromDegrees, toDegrees) {
	return (t) => rotation4(axis, fromDegrees + (toDegrees - fromDegrees) * t);
}

// Plays each path in turn, splitting progress evenly between them
export function chainPaths(...paths) {
	const n = paths.length;
	return (t) => {
		const i = Math.min(Math.floor(t * n), n - 1);
		return paths[i](t * n - i);
	};
}
