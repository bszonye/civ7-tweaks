const BZ_HEAD_STYLE = [
`
.extras-item-benchmark-graphics,
.extras-item-benchmark-ai {
    display: none;
}
`,
];
BZ_HEAD_STYLE.map(style => {
    const e = document.createElement('style');
    e.textContent = style;
    document.head.appendChild(e);
});
