<script>
	import { onDestroy } from "svelte";
	import { writable } from "svelte/store";
	import { fly } from "svelte/transition";
	import { createToolbar, melt } from "@melt-ui/svelte";
	import NumberSpinner from "svelte-number-spinner";
	import {
		RotateCw,
		MoveHorizontal,
		FlipHorizontal2,
		Undo2,
		Play
	} from "lucide-svelte";
	import { endMatrix, matrixTween, show3d, showPlayground } from "$stores";
	import { initMatrix, colorX, colorY, colorZ } from "$data/variables";
	import { gsap } from "$utils/gsap.js";
	import { from4x4, to4x4, makeTransform } from "$utils/transforms.js";

	const size = 24;
	const duration = 1;

	const tools = [
		{ id: "rotate", icon: RotateCw, label: "Rotate" },
		{ id: "scale", icon: MoveHorizontal, label: "Scale" },
		{ id: "reflect", icon: FlipHorizontal2, label: "Reflect" }
	];

	const axisColors = { x: colorX, y: colorY, z: colorZ };

	const activeTool = writable(undefined);

	const {
		elements: { root, separator },
		builders: { createToolbarGroup }
	} = createToolbar();

	const {
		elements: { group, item }
	} = createToolbarGroup({ value: activeTool });

	// Magnitudes
	let angle = 90;
	let factor = 2;

	// Selected axes per tool; rotation is single-select
	let selected = { rotate: ["z"], scale: ["x", "y"], reflect: ["y"] };

	$: activeIcon = tools.find((t) => t.id === $activeTool)?.icon;
	$: availableAxes = $show3d ? ["x", "y", "z"] : ["x", "y"];

	// In 2D, rotation is always about z, so there's no axis to choose
	$: rotate2d = $activeTool === "rotate" && !$show3d;
	$: axes = rotate2d
		? ["z"]
		: (selected[$activeTool] ?? []).filter((a) => availableAxes.includes(a));

	function toggleAxis(axis) {
		const tool = $activeTool;

		if (tool === "rotate") {
			selected[tool] = [axis];
		} else if (selected[tool].includes(axis)) {
			selected[tool] = selected[tool].filter((a) => a !== axis);
		} else {
			selected[tool] = [...selected[tool], axis];
		}
	}

	let tween;
	let animating = false;

	// `$matrixTween` holds a reference to the `$endMatrix` array,
	// so it has to be updated in place rather than replaced
	function setEndMatrix(values) {
		values.forEach((v, i) => ($endMatrix[i] = v));
		$endMatrix = $endMatrix;
	}

	function apply() {
		if (animating || !axes.length) return;
		animating = true;

		// Make sure the transformation isn't scrubbed back
		$matrixTween.progress(1);

		const start = from4x4($endMatrix);
		const tool = $activeTool;
		const toolAxes = [...axes];
		const magnitude = tool === "rotate" ? angle : factor;
		const state = { t: 0 };

		// Animate the angle / scale factor rather than the matrix entries,
		// e.g. so that a 180° rotation sweeps around instead of collapsing
		tween = gsap.to(state, {
			t: 1,
			duration,
			ease: "power2.inOut",
			onUpdate: () => {
				const T = makeTransform(tool, toolAxes, magnitude, state.t);
				setEndMatrix(to4x4(T.mmul(start)));
			},
			onComplete: () => (animating = false)
		});
	}

	function reset() {
		if (animating) return;
		animating = true;

		$matrixTween.progress(1);

		tween = gsap.to($endMatrix, {
			endArray: initMatrix,
			duration,
			ease: "power2.inOut",
			onUpdate: () => {
				$endMatrix = $endMatrix;
			},
			onComplete: () => (animating = false)
		});
	}

	// Don't fight the scroll-triggered resets when leaving the playground
	$: if (!$showPlayground) tween?.kill();
	onDestroy(() => tween?.kill());
</script>

<div
	class="fixed bottom-8 left-8 flex flex-col items-start gap-2 pointer-events-none"
	transition:fly={{ x: -20, duration: 200 }}
>
	<!-- Options popup for the selected transformation -->
	{#if $activeTool}
		<div
			class="panel flex items-center gap-2 pointer-events-auto"
			transition:fly={{ y: 10, duration: 200 }}
		>
			<div class="item" data-state="on">
				<svelte:component this={activeIcon} {size} />
			</div>

			{#if $activeTool === "rotate"}
				<NumberSpinner
					bind:value={angle}
					min={-360}
					max={360}
					step={1}
					speed={0.5}
					format={(v) => `${v}°`}
					parse={(s) => parseFloat(s)}
					class="number-spinner"
				/>
			{:else if $activeTool === "scale"}
				<NumberSpinner
					bind:value={factor}
					min={0.1}
					max={10}
					step={0.1}
					decimals={1}
					speed={0.1}
					format={(v) => `${v.toFixed(1)}×`}
					parse={(s) => parseFloat(s)}
					class="number-spinner"
				/>
			{/if}

			{#if !rotate2d}
				<div class="flex gap-1">
					{#each availableAxes as axis (axis)}
						<button
							class="axis"
							data-state={axes.includes(axis) ? "on" : "off"}
							style:--axis-color={axisColors[axis]}
							on:click={() => toggleAxis(axis)}
						>
							{axis}
						</button>
					{/each}
				</div>
			{/if}

			<button
				class="apply"
				disabled={animating || !axes.length}
				on:click={apply}
			>
				<Play size={18} />
				Apply
			</button>
		</div>
	{/if}

	<!-- Transformation types -->
	<div
		use:melt={$root}
		class="panel flex items-center gap-1 pointer-events-auto"
	>
		<div class="flex items-center gap-1" use:melt={$group}>
			{#each tools as tool (tool.id)}
				<button class="item" data-tip={tool.label} use:melt={$item(tool.id)}>
					<svelte:component this={tool.icon} {size} />
				</button>
			{/each}
		</div>

		<div class="separator" use:melt={$separator} />

		<button
			class="item"
			data-tip="Reset Matrix"
			disabled={animating}
			on:click={reset}
		>
			<Undo2 {size} />
		</button>
	</div>
</div>

<style lang="postcss">
	.panel {
		@apply rounded-md bg-base-200 px-2 py-2 shadow-lg shadow-neutral-content/20;
	}

	.item {
		@apply tooltip tooltip-info tooltip-top rounded-md p-2 transition-all;
	}
	.item:hover {
		@apply bg-base-100;
	}
	.item[data-state="on"] {
		@apply bg-neutral;
	}
	.item:focus-visible {
		@apply ring-2 ring-info;
	}

	.axis {
		@apply h-11 w-11 rounded-md font-serif text-2xl transition-all;
		color: var(--axis-color);
		opacity: 0.4;
	}
	.axis:hover {
		@apply bg-base-100;
		opacity: 0.8;
	}
	.axis[data-state="on"] {
		background-color: color-mix(in srgb, var(--axis-color) 25%, transparent);
		box-shadow: inset 0 0 0 2px var(--axis-color);
		opacity: 1;
	}

	.apply {
		@apply flex items-center gap-1 rounded-md bg-info px-3 py-2 font-bold text-info-content transition-all;
	}
	.apply:hover {
		@apply brightness-110;
	}
	.apply:disabled {
		@apply opacity-40;
	}

	.separator {
		@apply mx-1 w-[2px] self-stretch bg-neutral;
	}
</style>
