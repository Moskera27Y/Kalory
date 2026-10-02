import Capacitor
import HealthKit

/// Pasos del día vía HealthKit (sin dependencias externas).
@objc(KalorySteps)
public class KalorySteps: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KalorySteps"
    public let jsName = "KalorySteps"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getToday", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    @objc func getToday(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("sin_healthkit")
            return
        }
        guard let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            call.reject("sin_tipo")
            return
        }
        store.requestAuthorization(toShare: [], read: [steps]) { [weak self] granted, _ in
            guard granted else {
                call.reject("permiso_denegado")
                return
            }
            self?.queryToday(call, type: steps)
        }
    }

    private func queryToday(_ call: CAPPluginCall, type: HKQuantityType) {
        let cal = Calendar.current
        let start = cal.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
            var total = 0.0
            if let sum = result?.sumQuantity() {
                total = sum.doubleValue(for: HKUnit.count())
            }
            call.resolve(["steps": Int(total)])
        }
        store.execute(query)
    }
}
