document.addEventListener("DOMContentLoaded", () => {
  const filter = document.querySelector("[data-venue-filter]");
  if (!filter) return;
  filter.addEventListener("change", () => {
    document.querySelectorAll("[data-venue-type]").forEach((card) => {
      card.hidden = filter.value !== "all" && card.dataset.venueType !== filter.value;
    });
  });
});