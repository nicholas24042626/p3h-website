document.addEventListener("DOMContentLoaded", () => {
  const filter = document.querySelector("[data-testimony-filter]");
  if (!filter) return;
  filter.addEventListener("change", () => {
    document.querySelectorAll("[data-role]").forEach((card) => {
      card.hidden = filter.value !== "all" && card.dataset.role !== filter.value;
    });
  });
});