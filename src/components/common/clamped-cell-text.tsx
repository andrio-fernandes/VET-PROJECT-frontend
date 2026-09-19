interface ClampedCellTextProps {
  text: string;
  expanded: boolean;
  onToggle: () => void;
}

// Table cell text: collapsed to two lines with an ellipsis; clicking toggles
// the full text inline. Uses -webkit-line-clamp for the two-line clamp and the
// flex sizing needed inside fixed-layout table cells.
const ClampedCellText = ({ text, expanded, onToggle }: ClampedCellTextProps) => (
  <span
    className={`clamp-cell-text${expanded ? ' clamp-cell-text--expanded' : ''}`}
    onClick={onToggle}
    title={expanded ? 'Click to collapse' : 'Click to expand'}
  >
    {text}
  </span>
);

export default ClampedCellText;