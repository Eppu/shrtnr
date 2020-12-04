const app = new Vue({
    el: '#app',
    data: {
        url: '',
        slug: '',
        error: '',
        formVisible: true,
        created: null,
        copied: false,
    },
    methods: {
        async createUrl() {
            this.error = '';
            console.log(this.url, this.slug);
            const response = await fetch('/url', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    url: this.url,
                    slug: this.slug || undefined,
                })
            });
            if (response.ok) {
                const result = await response.json();
                this.formVisible = false;
                this.created = `${new URL(location.href)}${result.slug}`;
            } else if (response.status === 429) {
                this.error = "You're sending too many requests. Try again in 30 seconds. ✌️";
            } else {
                const result = await response.json();
                this.error = result.message;
            }
            this.created = await response.json();
        },
        async copyUrl(url) {
            console.log(url);
            try {
                await navigator.clipboard.writeText(url)
                this.copied = true;
              } catch (err) {
                console.error('Failed to copy!', err)
              }
          }
      
    }
})