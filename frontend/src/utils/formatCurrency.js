export const formatCurrency = (value) => {
    if (!value) return 'Gs. 0';
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0, // Los guaraníes no usan centavos
        maximumFractionDigits: 0
    }).format(value);
};