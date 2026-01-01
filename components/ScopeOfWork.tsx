
import React from 'react';
import { MILESTONES } from '../constants';

const ScopeOfWork: React.FC = () => {
  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Scope of Work</h1>
        <p className="text-gray-400 text-lg">Development roadmap for the LocalVocal MVP.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-12 bottom-12 w-px bg-white/10 hidden md:block"></div>

        {MILESTONES.map((milestone, idx) => (
          <div key={milestone.id} className="relative pl-0 md:pl-20 group">
            {/* Timeline Dot */}
            <div className={`absolute left-0 md:left-8 top-8 w-4 h-4 rounded-full border-4 border-[#0a0a0a] z-10 hidden md:block -ml-2 transition-transform group-hover:scale-125 ${
              milestone.status === 'completed' ? 'bg-green-500' :
              milestone.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-600'
            }`}></div>

            <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">Milestone 0{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        milestone.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        milestone.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500 animate-pulse' : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {milestone.status.replace('-', ' ')}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold">{milestone.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-mono text-gray-300">Est. {milestone.duration}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {milestone.tasks.map((task, tidx) => (
                    <div key={tidx} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                      <div className="mt-1">
                        <svg className={`w-4 h-4 ${milestone.status === 'completed' ? 'text-green-500' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-300">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="px-6 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
                <div className="flex -space-x-2">
                   {[1, 2, 3].map(i => (
                     <img key={i} className="w-6 h-6 rounded-full border-2 border-[#111111]" src={`https://picsum.photos/32/32?random=${i}`} alt="Avatar" />
                   ))}
                </div>
                <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">View detailed docs →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScopeOfWork;
