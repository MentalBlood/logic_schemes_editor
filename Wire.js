'use strict';

function distance(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function Wire(props) {
  const scale = 1;
  const from_point = props.from_point;
  const to_point = props.to_point;
  const length = distance(from_point, to_point);
  const angle = Math.atan2(to_point.y - from_point.y, to_point.x - from_point.x);
  return /*#__PURE__*/React.createElement("div", {
    className: "wire",
    style: {
      'left': 'calc(' + from_point.x + 'px' + ' + ' + '0vmin)',
      'top': 'calc(' + from_point.y + 'px' + ' - ' + 7 + 'px)',
      'width': length - 12 * 2 + 'px',
      'height': 14 + 'px',
      'transform': 'rotate(' + angle + 'rad) translate(' + 12 + 'px, 0)',
      'background': 'linear-gradient(90deg, deepskyblue ' + 3 + 'px, limegreen calc(100% - ' + 3 + 'px))'
    }
  });
}