export const formatCurrency = (amount: number, currencyCode: string = 'PHP') => {
  const currencyMap: Record<string, { locale: string; currency: string }> = {
    PHP: { locale: 'en-PH', currency: 'PHP' },
    USD: { locale: 'en-US', currency: 'USD' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
    GBP: { locale: 'en-GB', currency: 'GBP' },
    JPY: { locale: 'ja-JP', currency: 'JPY' },
    SGD: { locale: 'en-SG', currency: 'SGD' },
    MYR: { locale: 'ms-MY', currency: 'MYR' },
  };

  const { locale, currency } = currencyMap[currencyCode] || currencyMap.PHP;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (date: Date, format: string = 'MM/DD/YYYY') => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MMM DD, YYYY':
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${day}, ${year}`;
    default:
      return `${month}/${day}/${year}`;
  }
};