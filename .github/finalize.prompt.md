---
mode: agent
---

Objective:
The website is approximately 75% complete. Your task is to thoroughly review, complete, test, and polish the site for launch readiness. This includes verifying functionality, data integrity, UX polish, component reliability, and full user journey testing.
• Constraints: To ensure optimal performance, all components and pages must be designed with lightweight rendering, minimal re-renders, and efficient data handling in mind. Avoid unnecessary API calls, use debouncing/throttling where applicable, and ensure lazy loading of heavy or non-critical assets. All loops, data maps, and conditional renders should be optimized for large data sets. Images and assets must be compressed and served in modern formats (e.g., WebP). Use code-splitting to reduce initial load time, and implement caching and pagination for data-heavy views. Ensure that the DOM and CSS tree stay shallow, animations are GPU-accelerated, and memory usage remains stable throughout all interactions.

WORKFLOW:

# 🧠 Project Completion Guide for GitHub Copilot

## 🧾 Context

This is a partially completed (~75%) full-stack web application. The goal is to **review, complete, test, and polish** the project to production quality.

You are acting as a **senior developer and QA engineer**. Your tasks include:

---

## ✅ TASK CATEGORIES

### 🔍 1. General Functionality Review

- Test **every interaction** on each page (public & authenticated).
- Verify buttons, links, modals, toggles, and dynamic components work.
- Ensure all route navigation is correct.

### 📄 2. Page-by-Page Validation

For **each page** in the app:

- Check UI elements for layout, alignment, and responsiveness.
- Test inputs, forms, dropdowns, and tables.
- Validate client-side and server-side logic where applicable.

### 📦 3. Backend Integration

- Check if all API endpoints return expected data.
- Validate frontend matches backend state (data parity).
- Test DB retrievals for accuracy, completeness, and relation integrity.

### 🧪 4. User Role Testing

Use test accounts or mock users to simulate:

- Guest / Public
- Registered user
- Admin / Staff (if applicable)

Ensure appropriate access controls and role-based UI rendering.

### 🧯 5. Edge Case + Error Testing

Test and handle:

- Empty states (e.g., no data available)
- Invalid inputs / form errors
- Broken or slow API responses
- Session expiration and auth errors

### 🧹 6. Final UI/UX Polish

- Fix spacing, colors, alignment inconsistencies.
- Ensure transitions and animations are smooth.
- Ensure hover, focus, and active states are functional and styled.
- Make the app accessible (ARIA, keyboard navigation, alt text).

### 📊 7. Performance & SEO (if applicable)

- Optimize assets and images.
- Minify CSS/JS.
- Ensure fast load and interaction time.

---

## ⚠️ Deliverables / Output (Copilot)

Please help generate or refine:

- Missing component logic
- API fetch or form handlers
- Input validation
- UI enhancements (modals, dropdowns, loaders)
- Error/success states
- Page-specific improvements
- Database query improvements (if applicable)

---

## 📍 Notes

- All console logs and unused code should be removed.
- ESLint/Prettier standards must be followed.
- Any assumptions or major changes should be documented in code comments.

---

## ✅ Goal

When completed, this project should be:

- Fully functional across all routes and user roles
- Responsive and visually consistent
- Bug-free across major browsers
- Ready for handoff or deployment

---

# Let's complete and polish this app to professional production quality 🚀
