const form = document.querySelector<HTMLFormElement>('#event-submission-form');
const message = document.querySelector<HTMLElement>('#submission-message');

form?.addEventListener('submit', () => {
  if (message) {
    message.hidden = false;
    message.textContent = '送信しました。内容を確認後、掲載の可否をご連絡します。';
  }
});
