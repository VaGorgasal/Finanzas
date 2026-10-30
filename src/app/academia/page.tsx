'use client';
import { useState } from 'react';
import { Header, Section, Tag } from '../../components/Common';
import { lessons } from '../../data/lessons.ts';
import { usePortfolio } from '../../context/PortfolioContext';
export default function AcademiaPage(){
  const {state,completeLesson}=usePortfolio();
  const [selected,setSelected]=useState(lessons[0].id);
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const lesson=lessons.find(l=>l.id===selected)!;
  const answer=answers[lesson.id];
  const progress=Math.round(state.completedLessons.length/lessons.length*100);
  function selectNext(){const i=lessons.findIndex(l=>l.id===selected);setSelected(lessons[Math.min(i+1,lessons.length-1)].id);}
  return <>
    <Header eyebrow="APRENDE A TU RITMO" title="Academia financiera" description="Cinco lecciones breves para construir criterio propio, sin jerga ni prisas." action={<Tag tone="mint">{state.completedLessons.length}/{lessons.length} completadas</Tag>}/>
    <div className="academyHead"><div><strong>Tu recorrido de aprendizaje</strong><span>{progress} % del curso inicial</span></div><div className="progressTrack"><span style={{width:`${progress}%`}}/></div></div>
    <div className="contentGrid">
      <Section className="span5" title="Tus lecciones">
        <div className="lessonList">{lessons.map((l,i)=><button key={l.id} type="button" className={`lessonButton ${selected===l.id?'current':''}`} onClick={()=>setSelected(l.id)} aria-current={selected===l.id?'step':undefined}><span className="lessonNumber">{state.completedLessons.includes(l.id)?'✓':String(i+1).padStart(2,'0')}</span><span><strong>{l.title}</strong><small>{l.minutes} min · {state.completedLessons.includes(l.id)?'Completada':'Por descubrir'}</small></span><span className="lessonArrow">→</span></button>)}</div>
      </Section>
      <Section className="span7" extra={<Tag>Lección {lessons.findIndex(l=>l.id===selected)+1} de {lessons.length}</Tag>}>
        <div className="academySymbol">✦</div><h2 className="lessonHeading">{lesson.title}</h2><p className="leadText">{lesson.description}</p>
        <div className="conceptBox"><span>IDEA CLAVE</span><p>{lesson.concept}</p></div>
        <h3 className="quizTitle">Comprueba lo que has aprendido</h3><p className="muted">{lesson.question}</p>
        <div className="choiceList">{lesson.choices.map((choice,i)=><button key={i} type="button" onClick={()=>{setAnswers(a=>({...a,[lesson.id]:i}));if(i===lesson.correct)completeLesson(lesson.id);}} className={`choice ${answer===i?(i===lesson.correct?'correct':'incorrect'):''}`} aria-pressed={answer===i}><span className="choiceLetter">{String.fromCharCode(65+i)}</span>{choice}</button>)}</div>
        {answer!==undefined&&<div role="status" className={`quizFeedback ${answer===lesson.correct?'good':'retry'}`}><strong>{answer===lesson.correct?'¡Exacto!':'Todavía no.'}</strong> {lesson.explanation}</div>}
        <div className="academyFoot"><span className="muted small">Tu progreso se guarda en este navegador.</span><button type="button" className="primaryButton" disabled={answer!==lesson.correct || selected===lessons[lessons.length-1].id} onClick={selectNext}>Siguiente lección →</button></div>
      </Section>
    </div>
  </>;
}
