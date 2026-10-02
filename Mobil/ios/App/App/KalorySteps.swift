import Capacitor
import HealthKit

/// Pasos del día vía HealthKit (sin dependencias externas).
@objc(KalorySteps)
public class KalorySteps: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KalorySteps"
    public let jsName = "KalorySteps"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getToday", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWeight", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSleep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkout", returnType: CAPPluginReturnPromise)
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

    /// Último peso corporal registrado en Salud (kg).
    @objc func getWeight(_ call: CAPPluginCall) {
        guard let wt = HKObjectType.quantityType(forIdentifier: .bodyMass) else {
            call.reject("sin_tipo")
            return
        }
        store.requestAuthorization(toShare: [], read: [wt]) { [weak self] granted, _ in
            guard granted, let self = self else {
                call.reject("permiso_denegado")
                return
            }
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let q = HKSampleQuery(sampleType: wt, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                guard let s = samples?.first as? HKQuantitySample else {
                    call.resolve(["kg": 0])
                    return
                }
                let kg = s.quantity.doubleValue(for: HKUnit.gramUnit(with: .kilo))
                call.resolve(["kg": kg])
            }
            self.store.execute(q)
        }
    }

    /// Horas dormidas en las últimas 24h (suma de fases de sueño).
    @objc func getSleep(_ call: CAPPluginCall) {
        guard let sl = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.reject("sin_tipo")
            return
        }
        store.requestAuthorization(toShare: [], read: [sl]) { [weak self] granted, _ in
            guard granted, let self = self else {
                call.reject("permiso_denegado")
                return
            }
            let start = Date().addingTimeInterval(-24 * 3600)
            let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
            let q = HKSampleQuery(sampleType: sl, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
                var secs = 0.0
                for case let s as HKCategorySample in samples ?? [] {
                    switch s.value {
                    case HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                         HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                         HKCategoryValueSleepAnalysis.asleepREM.rawValue,
                         HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue:
                        secs += s.endDate.timeIntervalSince(s.startDate)
                    default:
                        break
                    }
                }
                call.resolve(["hours": secs / 3600.0])
            }
            self.store.execute(q)
        }
    }

    /// Guarda el entreno en Salud (kcal estimadas, inicio/fin en ms).
    @objc func saveWorkout(_ call: CAPPluginCall) {
        guard let wt = HKObjectType.workoutType() as? HKWorkoutType else {
            call.reject("sin_tipo")
            return
        }
        store.requestAuthorization(toShare: [wt], read: []) { [weak self] granted, _ in
            guard granted, let self = self else {
                call.reject("permiso_denegado")
                return
            }
            let opts = call.options as? [String: Any] ?? [:]
            let num = { (k: String) -> Double in (opts[k] as? NSNumber)?.doubleValue ?? 0 }
            let startMs = num("startMs")
            let endMs = num("endMs")
            let kcal = num("kcal")
            let start = Date(timeIntervalSince1970: (startMs > 0 ? startMs : Date().addingTimeInterval(-2700).timeIntervalSince1970 * 1000) / 1000)
            let end = Date(timeIntervalSince1970: (endMs > 0 ? endMs : Date().timeIntervalSince1970 * 1000) / 1000)
            let energy = HKQuantity(unit: HKUnit.kilocalorie(), doubleValue: kcal)
            let workout = HKWorkout(activityType: .traditionalStrengthTraining, start: start, end: end, duration: end.timeIntervalSince(start), totalEnergyBurned: energy, totalDistance: nil, metadata: [HKMetadataKeyWasUserEntered: true])
            self.store.save(workout) { ok, _ in
                ok ? call.resolve(["ok": true]) : call.reject("no_guardado")
            }
        }
    }
}
