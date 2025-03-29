class GameGemCopy {
    constructor() {
      this.init();
    }
  
    init() {
      document.querySelectorAll('.bitcoin-address, .ethereum-address').forEach(addressElement => {
        addressElement.addEventListener('click', () => {
          const address = addressElement.getAttribute('data-address');
          console.log('Clicked address:', address);
  
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(address).then(() => {
              console.log('Successfully copied to clipboard:', address);
              addressElement.classList.add('copied');
              setTimeout(() => {
                addressElement.classList.remove('copied');
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy with navigator.clipboard:', err);
              this.fallbackCopy(address, addressElement);
            });
          } else {
            console.log('navigator.clipboard not supported, using fallback');
            this.fallbackCopy(address, addressElement);
          }
        });
      });
    }
  
    fallbackCopy(address, addressElement) {
      const tempInput = document.createElement('textarea');
      tempInput.value = address;
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        document.execCommand('copy');
        console.log('Successfully copied using fallback:', address);
        addressElement.classList.add('copied');
        setTimeout(() => {
          addressElement.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy with fallback:', err);
        alert('Failed to copy address. Please copy it manually.');
      } finally {
        document.body.removeChild(tempInput);
      }
    }
  }
  
  const gameGem = new GameGemCopy();