// public/js/main.js
// Client-side utilities for NovaTech Ventures

// Close modal when clicking backdrop
document.addEventListener('click', function(e) {
  const modal = document.getElementById('verifModal') || document.getElementById('orderModal');
  if (modal && e.target === modal) {
    modal.classList.add('hidden');
  }
});

// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });
});
