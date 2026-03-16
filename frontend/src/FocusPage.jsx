import React from "react";
import MapLibreMap from "./components/map/MapLibreMap";
import kenyaCountiesRaw from "./data/ken_admin1.geojson?raw";

const kenyaCounties = JSON.parse(kenyaCountiesRaw);

const FOCUS_COUNTIES = [
  {
    name: "Nairobi",
    role: "Urban flood epicenter",
    riskLevel: "High",
    details:
      "Flash floods are expected in low-lying estates and transport corridors due to heavy rainfall and drainage overflow.",
    priorities: ["Drain clearance", "Traffic management", "Targeted SMS warnings"]
  },
  {
    name: "Kiambu",
    role: "Upstream runoff contributor",
    riskLevel: "Medium-High",
    details:
      "River and surface runoff from peri-urban zones can intensify downstream flooding toward Nairobi.",
    priorities: ["River monitoring", "Community watch points", "Road culvert maintenance"]
  },
  {
    name: "Kajiado",
    role: "Southern floodplain exposure",
    riskLevel: "Medium",
    details:
      "Seasonal river crossings and flood-prone settlements face localized inundation and temporary access cuts.",
    priorities: ["Evacuation routes", "Temporary shelters", "Livestock protection planning"]
  }
];

const focusCountyNames = new Set(FOCUS_COUNTIES.map((county) => county.name));

const focusCountyGeoJson = {
  type: "FeatureCollection",
  features: kenyaCounties.features.filter((feature) =>
    focusCountyNames.has(feature.properties.adm1_name)
  )
};


function FocusPage() {
  return (
    <div className="page focus-page">
      <header className="hero focus-hero">
        <p className="tag">CRISISLENS FOCUS</p>
        <h1>Flood focus area: Nairobi, Kiambu, and Kajiado.</h1>
        <p className="subhead">
          This focused page narrows the response plan to one crisis type (floods) and three
          neighboring counties to support faster coordination and decision-making.
        </p>
      </header>

      <section className="focus-section">
        <div className="details-header">
          <h2>Focus map</h2>
          <span className="badge flood">Nairobi Cluster</span>
        </div>
        <p className="focus-map-caption">
          Nairobi is highlighted as the primary flood pressure zone, with Kiambu and Kajiado shown
          as adjacent counties that influence runoff and response access.
        </p>
        <div className="focus-map-wrapper">
          <MapLibreMap
            focusCountiesGeoJSON={focusCountyGeoJson}
            focusAreasGeoJSON={{ type: "FeatureCollection", features: [] }}
            riskByCounty={{}}
            areaRiskByKey={{}}
            selectedCounties={["Nairobi", "Kiambu", "Kajiado"]}
          />
        </div>
      </section>

      <section className="focus-section">
        <div className="details-header">
          <h2>Priority counties</h2>
          <span className="badge flood">Flood Response Zone</span>
        </div>

        <div className="focus-grid">
          {FOCUS_COUNTIES.map((county) => (
            <article key={county.name} className="focus-card">
              <h3>{county.name}</h3>
              <p className="label">Role</p>
              <p>{county.role}</p>
              <p className="label">Risk level</p>
              <p>{county.riskLevel}</p>
              <p className="label">Current concern</p>
              <p>{county.details}</p>
              <p className="label">Immediate priorities</p>
              <ul>
                {county.priorities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="focus-section">
        <div className="details-header">
          <h2>7-day operating goals</h2>
        </div>
        <div className="details-grid">
          <div>
            <p className="label">Preparedness</p>
            <p>Complete pre-flood drain and culvert checks in known flood hotspots.</p>
          </div>
          <div>
            <p className="label">Early warning</p>
            <p>Push county-specific advisories every 12 hours to local administrators.</p>
          </div>
          <div>
            <p className="label">Response</p>
            <p>Pre-position rescue boats, first aid kits, and temporary shelter materials.</p>
          </div>
          <div>
            <p className="label">Recovery readiness</p>
            <p>Identify rapid road reopening teams for high-traffic links into Nairobi.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FocusPage;
