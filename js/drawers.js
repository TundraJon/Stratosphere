    // Collapsible Drawers UI Handlers
    function toggleDrawer(id) {
        const drawer = document.getElementById(id);
        const isOpen = drawer.classList.contains('expanded');
        
        // Retract others to keep the UI perfectly single-pane
        if (!isOpen) {
            document.querySelectorAll('.drawer').forEach(d => {
                d.classList.remove('expanded');
                d.classList.add('collapsed');
            });
            drawer.classList.add('expanded');
            drawer.classList.remove('collapsed');
        } else {
            drawer.classList.remove('expanded');
            drawer.classList.add('collapsed');
        }
        updateDrawerArrows();
    }

    // Arrows always point the direction the drawer will move on next tap:
    // Top drawer opens downward, so expanded = ▲ (tap collapses back up),
    // collapsed = ▼ (tap opens down). Bottom drawer is the mirror image.
    function updateDrawerArrows() {
        const topOpen = document.getElementById('top-drawer').classList.contains('expanded');
        const bottomOpen = document.getElementById('bottom-drawer').classList.contains('expanded');
        const topArrow = document.getElementById('top-drawer-arrow');
        const bottomArrow = document.getElementById('bottom-drawer-arrow');
        if (topArrow) topArrow.textContent = topOpen ? '▲' : '▼';
        if (bottomArrow) bottomArrow.textContent = bottomOpen ? '▼' : '▲';
    }

    // Initialize drawers
    document.addEventListener("DOMContentLoaded", () => {
        document.getElementById('top-drawer').classList.add('expanded');
        document.getElementById('bottom-drawer').classList.add('collapsed');
        updateDrawerArrows();
    });
