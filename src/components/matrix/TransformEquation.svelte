<script>
	import Tex from "./Tex.svelte";
	import { colorX, colorY, colorZ } from "$data/variables";
	import { from4x4, makeTransform } from "$utils/transforms.js";

	// The transformation about to be applied, and the matrix it's applied to
	export let tool;
	export let axes;
	export let magnitude;
	export let current;
	export let dims = 2;

	const columnColors = [colorX, colorY, colorZ];

	function formatNumber(v) {
		const rounded = Math.round(v * 100) / 100;
		// Avoid showing "-0"
		return String(rounded === 0 ? 0 : rounded);
	}

	// Columns are colored by the basis vector they represent
	function matrixTex(m) {
		const rows = [];
		for (let i = 0; i < dims; i++) {
			const row = [];
			for (let j = 0; j < dims; j++) {
				row.push(
					`\\textcolor{${columnColors[j]}}{${formatNumber(m.get(i, j))}}`
				);
			}
			rows.push(row.join(" & "));
		}
		return `\\begin{bmatrix} ${rows.join(" \\\\ ")} \\end{bmatrix}`;
	}

	function transformLabel(tool, axes, magnitude) {
		if (tool === "rotate")
			return `R_{${axes[0]}}(${formatNumber(magnitude)}^\\circ)`;
		if (tool === "scale")
			return `S_{${axes.join("")}}(${formatNumber(magnitude)})`;
		return `F_{${axes.join("")}}`;
	}

	$: T = makeTransform(tool, axes, magnitude);
	$: M = from4x4(current);
	$: result = T.mmul(M);

	$: expr = String.raw`\displaystyle
\underset{${transformLabel(tool, axes, magnitude)}}{${matrixTex(T)}}
\underset{\text{current}}{${matrixTex(M)}}
=
\underset{\text{new}}{${matrixTex(result)}}`;
</script>

<Tex {expr} />
