import * as Cesium from "cesium";


/**
 * 计算两个地理坐标之间的大圆航向
 * @param {Cartographic} from - 起始地理坐标
 * @param {Cartographic} to - 目标地理坐标
 * @returns {number} 航向角度（度数）
 */
export function computeHeading(from, to) {
  const lon1 = Cesium.Math.toRadians(from.longitude)
  const lat1 = Cesium.Math.toRadians(from.latitude)
  const lon2 = Cesium.Math.toRadians(to.longitude)
  const lat2 = Cesium.Math.toRadians(to.latitude)

  const dLon = lon2 - lon1

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  let heading = Math.atan2(y, x)
  heading = Cesium.Math.toDegrees(heading)
  heading = (heading + 360) % 360 // 标准化到 0-360 度

  return heading
}

/**
 * 考虑地球曲率的 heading 和 pitch 计算
 * @param {Cartesian3} fromPosition - 起始位置
 * @param {Cartesian3} toPosition - 目标位置
 * @returns {Object} 包含 heading 和 pitch 的对象
 */
export function getHeadingPitch(fromPosition, toPosition) {
  const ellipsoid = Cesium.Ellipsoid.WGS84

  // 将笛卡尔坐标转换为地理坐标
  const fromCartographic = ellipsoid.cartesianToCartographic(fromPosition)
  const toCartographic = ellipsoid.cartesianToCartographic(toPosition)

  // 计算大圆航向
  const heading = computeHeading(fromCartographic, toCartographic)

  // 计算俯仰角（考虑高度差）
  const distance = Cesium.Cartesian3.distance(fromPosition, toPosition)
  const heightDifference = toCartographic.height - fromCartographic.height
  const pitch = Math.atan2(heightDifference, distance)

  return {
    heading: Cesium.Math.toRadians(heading),
    pitch: pitch,
    headingDegrees: heading,
    pitchDegrees: Cesium.Math.toDegrees(pitch),
    distance: distance,
    heightDifference: heightDifference,
  }
}