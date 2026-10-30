const minimumHeadlineSize = 32;
const maximumFitSteps = 6;

function fitToWidth(node: HTMLElement, size: number) {
  let current = size;
  node.style.fontSize = `${current}px`;
  for (let step = 0; step < maximumFitSteps && node.scrollWidth > node.clientWidth && current > minimumHeadlineSize; step += 1) {
    current = Math.max(minimumHeadlineSize, Math.floor((current * node.clientWidth) / node.scrollWidth));
    node.style.fontSize = `${current}px`;
  }
}

export function fitHeadline(node: HTMLElement, size: number) {
  let current = size;
  let measuredWidth = -1;
  const refit = () => {
    fitToWidth(node, current);
    measuredWidth = node.clientWidth;
  };
  const observer = new ResizeObserver(() => {
    if (node.clientWidth !== measuredWidth) refit();
  });
  observer.observe(node);
  refit();
  void document.fonts.ready.then(refit);
  return {
    update(next: number) {
      current = next;
      refit();
    },
    destroy() {
      observer.disconnect();
    },
  };
}
