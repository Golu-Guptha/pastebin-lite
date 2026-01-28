document.getElementById('pasteForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = document.getElementById('content').value;
    const ttl = document.getElementById('ttl').value;
    const maxViews = document.getElementById('maxViews').value;

    const payload = {
        content: content
    };

    if (ttl) payload.ttl_seconds = parseInt(ttl);
    if (maxViews) payload.max_views = parseInt(maxViews);

    try {
        const response = await fetch('/api/pastes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMsg = 'Failed to create paste';
            try {
                const errData = await response.json();
                if (errData.error) errorMsg += ': ' + errData.error;
            } catch (e) { /* ignore JSON parse error */ }

            alert(errorMsg);
            return;
        }

        const data = await response.json();

        const resultDiv = document.getElementById('result');
        const link = document.getElementById('pasteLink');

        link.href = data.url;
        link.textContent = data.url;
        resultDiv.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert('An error occurred.');
    }
});
