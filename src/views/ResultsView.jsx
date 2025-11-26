import React from "react";

export default function ResultsView({state}){
  const results = state.results||[];
  const showPlayTime = state.settings?.showPlayTime ?? true;
  const sortPref = state.settings?.sortPreference ?? "Random";

  if(!results.length) return <div className="card">No games match your criteria.</div>;

  // Prepare sorted results according to preference
  const sortResults = (list) => {
    if(sortPref === "Random"){
      // Fisher-Yates shuffle
      const arr = list.slice();
      for(let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    if(sortPref === "Alphabetically"){
      return list.slice().sort((a,b)=> a.game.name.localeCompare(b.game.name));
    }
    if(sortPref === "Longest to shortest"){
      return list.slice().sort((a,b)=> (b.maxPlayTime || b.game.maxPlayTime || 0) - (a.maxPlayTime || a.game.maxPlayTime || 0));
    }
    // Shortest to longest
    return list.slice().sort((a,b)=> (a.minPlayTime || a.game.minPlayTime || 0) - (b.minPlayTime || b.game.minPlayTime || 0));
  }

  if(sortPref === "Random"){
    const shuffled = sortResults(results);
    const first = shuffled[0];
    const rest = shuffled.slice(1);
    return (
      <div>
        <h2>You should play:</h2>
        <div className="game-row" style={{marginBottom:8}}>
          <div><strong>{first?.game?.name}</strong>{showPlayTime && first && <span className="small"> ({first.minPlayTime===first.maxPlayTime? `~${first.minPlayTime} min`:`${first.minPlayTime}-${first.maxPlayTime} min`})</span>}</div>
        </div>
        {rest.length>0 && <h3>No? How about:</h3>}
        {rest.map(r=> <div className="game-row" key={r.game.id}><div><strong>{r.game.name}</strong>{showPlayTime && <span className="small"> ({r.minPlayTime===r.maxPlayTime? `~${r.minPlayTime} min`:`${r.minPlayTime}-${r.maxPlayTime} min`})</span>}</div></div>)}
      </div>
    )
  }else{
    // single list
    const title = sortPref === "Alphabetically" ? "All games matching criteria:" : sortPref === "Longest to shortest" ? "Games sorted from longest to shortest:" : "Games sorted from shortest to longest:";
    const sorted = sortResults(results);
    return (
      <div>
        <h2>{title}</h2>
        {sorted.map(r=> <div className="game-row" key={r.game.id}><div><strong>{r.game.name}</strong>{showPlayTime && <span className="small"> ({r.minPlayTime===r.maxPlayTime? `~${r.minPlayTime} min`:`${r.minPlayTime}-${r.maxPlayTime} min`})</span>}</div></div>)}
      </div>
    )
  }
}
