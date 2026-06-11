import { startTransition } from 'react'
import { useApp } from '../../context/AppContext'
import { buildStatuses, vehicleTypes, years, getMakeOptions, getModelOptions, getVehicleLabel, statusClass } from '../../constants'
import AppSelect from '../AppSelect'

export default function BuildsTab() {
  const {
    workspace, activeBuild, isShop,
    newBuild, setNewBuild, addBuild, deleteBuild,
    setActiveBuildId, setActiveTab,
  } = useApp()

  return (
<section className="page-section">
            <article className="card">
              <div className="card-title">Build selector</div>
              <div className="build-list-table">
                {workspace.builds.map((build) => (
                  <div className={`build-row ${build.id === activeBuild.id ? 'active' : ''}`} key={build.id}>
                    <button
                      className="build-select-button"
                      onClick={() => {
                        startTransition(() => {
                          setActiveBuildId(build.id)
                          setActiveTab('dashboard')
                        })
                      }}
                    >
                      <strong>{build.name}</strong>
                      <span>{getVehicleLabel(build)}</span>
                    </button>
                    <div className="row-actions">
                      <span className={`pill ${statusClass(build.status)}`}>{build.status}</span>
                      <button className="button small subtle delete-button" onClick={(event) => { event.stopPropagation(); deleteBuild(build.id) }}>Delete</button>
</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <div className="card-title">Add build</div>
              <form className="form-grid three" onSubmit={addBuild}>
                <input onChange={(event) => setNewBuild({ ...newBuild, name: event.target.value })} placeholder="Build name" value={newBuild.name} />
                <AppSelect
                  onChange={(event) => {
                    const vt = event.target.value
                    const firstMake = getMakeOptions(vt)[0]
                    const firstModel = getModelOptions(firstMake)[0]
                    setNewBuild({ ...newBuild, vehicleType: vt, vehicleMake: firstMake, vehicleModel: firstModel })
                  }}
                  value={newBuild.vehicleType}
                >
                  {vehicleTypes.map((vehicleType) => <option key={vehicleType} value={vehicleType}>{vehicleType}</option>)}
                </AppSelect>
                <AppSelect onChange={(event) => setNewBuild({ ...newBuild, vehicleYear: event.target.value })} value={newBuild.vehicleYear}>
                  <option value="">Year</option>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </AppSelect>
                <AppSelect
                  onChange={(event) => setNewBuild({ ...newBuild, vehicleMake: event.target.value, vehicleModel: getModelOptions(event.target.value)[0] })}
                  value={newBuild.vehicleMake}
                >
                  {getMakeOptions(newBuild.vehicleType).map((make) => <option key={make} value={make}>{make}</option>)}
                </AppSelect>
                <AppSelect onChange={(event) => setNewBuild({ ...newBuild, vehicleModel: event.target.value })} value={newBuild.vehicleModel}>
                  {getModelOptions(newBuild.vehicleMake).map((model) => <option key={model} value={model}>{model}</option>)}
                </AppSelect>
                <AppSelect onChange={(event) => setNewBuild({ ...newBuild, status: event.target.value })} value={newBuild.status}>
                  {buildStatuses.map((status) => <option key={status}>{status}</option>)}
                </AppSelect>
                <button className="button primary" type="submit">Create build</button>
              </form>
            </article>
          </section>
      )
}