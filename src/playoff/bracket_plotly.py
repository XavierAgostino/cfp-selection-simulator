import plotly.graph_objects as go
import pandas as pd
from typing import List, Dict, Optional

# --- 1. Enhanced Color Handling ---
TEAM_COLORS = {
    # SEC
    'Georgia': '#BA0C2F', 'Alabama': '#9E1B32', 'Texas': '#BF5700', 
    'Tennessee': '#FF8200', 'Ole Miss': '#CE1126', 'LSU': '#461D7C',
    'Missouri': '#F1B82D', 'Oklahoma': '#841617', 'Texas A&M': '#500000',
    'South Carolina': '#73000A', 'Kentucky': '#0033A0', 'Florida': '#FA4616',
    'Auburn': '#0C2340', 'Vanderbilt': '#866D4B', 'Arkansas': '#9D2235',
    
    # Big Ten
    'Ohio State': '#BB0000', 'Oregon': '#154733', 'Penn State': '#041E42',
    'Indiana': '#990000', 'Michigan State': '#18453B', 'Michigan': '#00274C', 
    'USC': '#990000', 'Wisconsin': '#C5050C', 'Iowa State': '#C8102E', 'Iowa': '#FFCD00', 
    'Nebraska': '#E41C38', 'Illinois': '#E84A27', 'Minnesota': '#7A0019', 
    'Washington': '#4B2E83', 'UCLA': '#2D68C4',
    
    # ACC
    'Miami': '#005030', 'Clemson': '#F56600', 'SMU': '#0033A0',
    'Florida State': '#782F40', 'Louisville': '#C9001F', 'North Carolina': '#7BAFD4',
    'Virginia Tech': '#630031', 'Pitt': '#FFB81C',
    
    # Big 12
    'BYU': '#002E5D', 'Kansas State': '#512888',
    'Colorado': '#CFB87C', 'Arizona State': '#8C1D40', 'Utah': '#CC0000',
    'Oklahoma State': '#FF7300', 'TCU': '#4D1979', 'Texas Tech': '#CC0000',
    'Baylor': '#154734', 'West Virginia': '#002855', 'UCF': '#BA9B37',
    
    # G5 / Independent / Pac-12
    'Notre Dame': '#0C2340', 'Boise State': '#0033A0', 'Army': '#D4BF80',
    'Navy': '#00205B', 'Tulane': '#006747', 'UNLV': '#CF0A2C',
    'Memphis': '#003087', 'Liberty': '#002D62', 'Louisiana': '#CE181E',
    'Washington State': '#981E32', 'Oregon State': '#DC4405'
}

def get_team_color(team_name: str) -> str:
    """Robust color lookup that prevents 'Iowa' matching 'Iowa State'."""
    if not team_name:
        return "#667eea"
    
    if team_name in TEAM_COLORS:
        return TEAM_COLORS[team_name]
        
    sorted_keys = sorted(TEAM_COLORS.keys(), key=len, reverse=True)
    for key in sorted_keys:
        if key in team_name:
            return TEAM_COLORS[key]
            
    return "#667eea"

def create_interactive_bracket(seeded_df: pd.DataFrame, first_round: List, title: str = "College Football Playoff"):
    """Create interactive bracket with fixed badge positioning."""
    fig = go.Figure()
    teams = seeded_df.to_dict('records')

    # --- Coordinates ---
    pos = {
        1: (2, 8), 4: (2, 6), 3: (2, 3), 2: (2, 1), # Byes
        8: (1, 8.5), 9: (1, 7.5), 5: (1, 6.5), 12: (1, 5.5), # R1 Top
        6: (1, 3.5), 11: (1, 2.5), 7: (1, 1.5), 10: (1, 0.5)  # R1 Bottom
    }
    qf_pos = {'Q1': (4, 8), 'Q2': (4, 6), 'Q3': (4, 3), 'Q4': (4, 1)}
    sf_pos = {'S1': (6, 7), 'S2': (6, 2)}
    final_pos = (8, 4.5)

    # --- Draw Teams ---
    for team in teams:
        seed = team['seed']
        name = team['team']
        x, y = pos.get(seed, (0,0))
        
        # Format Stats for Hover
        sor = f"#{int(team.get('sor_rank', 99))}" if pd.notna(team.get('sor_rank')) else 'N/A'
        sos = f"#{int(team.get('sos_rank', 99))}" if pd.notna(team.get('sos_rank')) else 'N/A'
        pred = f"#{int(team.get('predictive_rank', 99))}" if pd.notna(team.get('predictive_rank')) else 'N/A'
        record = f"{team.get('wins',0)}-{team.get('losses',0)}"
        
        hover_html = (
            f"<b>#{seed} {name}</b><br>Record: {record}<br>Conf: {team.get('conference','')}<br>"
            f"----------------<br>SOR: {sor} | SOS: {sos} | Pred: {pred}"
        )

        # 1. Main Team Box
        color = get_team_color(name)
        fig.add_shape(
            type="rect", x0=x-0.4, y0=y-0.3, x1=x+0.4, y1=y+0.3,
            line=dict(color="black", width=1), fillcolor=color, layer="below"
        )
        
        # 2. Team Name & Record (Centered)
        fig.add_trace(go.Scatter(
            x=[x], y=[y], mode='text',
            text=[f"<b>{name}</b><br><span style='font-size:9px'>{record}</span>"],
            textposition="middle center",
            textfont=dict(color='white', size=11),
            hoverinfo="text", hovertext=hover_html, showlegend=False
        ))
        
        # 3. Seed Badge (Top-Left Corner)
        fig.add_shape(
            type="circle", 
            x0=x-0.48, y0=y+0.12, x1=x-0.28, y1=y+0.32,
            fillcolor="white", line=dict(color="black", width=1.5)
        )
        fig.add_annotation(
            x=x-0.38, y=y+0.22, text=f"<b>{seed}</b>", 
            showarrow=False, font=dict(size=11, color="black", family="Arial Black")
        )

    # --- Draw Connectors ---
    path_map = {8:'Q1', 9:'Q1', 5:'Q2', 12:'Q2', 6:'Q3', 11:'Q3', 7:'Q4', 10:'Q4'}
    
    # R1 -> QF
    for game in first_round:
        h, l = game.seed_high, game.seed_low
        hx, hy = pos[h]; lx, ly = pos[l]
        qx, qy = qf_pos[path_map[h]]
        mid = hx + 1.8
        
        fig.add_shape(type="line", x0=hx+0.4, y0=hy, x1=mid, y1=hy, line=dict(color="#888"))
        fig.add_shape(type="line", x0=lx+0.4, y0=ly, x1=mid, y1=ly, line=dict(color="#888"))
        fig.add_shape(type="line", x0=mid, y0=hy, x1=mid, y1=ly, line=dict(color="#888"))
        fig.add_shape(type="line", x0=mid, y0=(hy+ly)/2, x1=qx-0.4, y1=qy, line=dict(color="#888"))

    # Byes -> QF
    bye_map = {1:'Q1', 4:'Q2', 3:'Q3', 2:'Q4'}
    for s, q in bye_map.items():
        bx, by = pos[s]; qx, qy = qf_pos[q]
        fig.add_shape(type="line", x0=bx+0.4, y0=by, x1=qx-0.4, y1=qy, line=dict(color="#888"))

    # QF -> SF
    sf_paths = [('Q1','S1'), ('Q2','S1'), ('Q3','S2'), ('Q4','S2')]
    for q, s in sf_paths:
        qx, qy = qf_pos[q]; sx, sy = sf_pos[s]
        mid = (qx + sx) / 2
        fig.add_shape(type="line", x0=qx+0.4, y0=qy, x1=mid, y1=qy, line=dict(color="#888"))
        fig.add_shape(type="line", x0=mid, y0=qy, x1=mid, y1=sy, line=dict(color="#888"))
        fig.add_shape(type="line", x0=mid, y0=sy, x1=sx-0.4, y1=sy, line=dict(color="#888"))

    # SF -> Final
    fx, fy = final_pos
    for s, (sx, sy) in sf_pos.items():
        mid = (sx + fx) / 2
        fig.add_shape(type="line", x0=sx+0.4, y0=sy, x1=mid, y1=sy, line=dict(color="#888"))
        fig.add_shape(type="line", x0=mid, y0=sy, x1=mid, y1=fy, line=dict(color="#888"))
        fig.add_shape(type="line", x0=mid, y0=fy, x1=fx-0.6, y1=fy, line=dict(color="#888"))

    # Empty Slots (QF, SF)
    for locs in [qf_pos.values(), sf_pos.values()]:
        for x, y in locs:
            fig.add_shape(type="rect", x0=x-0.4, y0=y-0.3, x1=x+0.4, y1=y+0.3,
                         line=dict(color="#ccc"), fillcolor="#f9f9f9")
            
    # Final Box
    fig.add_shape(type="rect", x0=fx-0.6, y0=fy-0.4, x1=fx+0.6, y1=fy+0.4,
                 line=dict(color="#DAA520", width=3), fillcolor="#222")
    fig.add_annotation(x=fx, y=fy, text="<b>NATIONAL<br>CHAMPION</b>", 
                      font=dict(color="#DAA520", size=12), showarrow=False)

    # --- RESTORED: Round Labels ---
    labels = [
        (1, 9.5, "FIRST ROUND"),
        (2, 9.5, "BYES"),
        (4, 9.5, "QUARTERFINALS"),
        (6, 9.5, "SEMIFINALS"),
        (8, 9.5, "NATIONAL TITLE"),
    ]
    for x, y, text in labels:
        fig.add_annotation(x=x, y=y, text=f"<b>{text}</b>", showarrow=False,
                          font=dict(size=11, color="#444"))

    fig.update_layout(
        title=dict(text=f"<b>{title}</b>", x=0.5, xanchor='center'),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[0,9]),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-0.5, 10]),
        width=1300, height=800, plot_bgcolor='white', hovermode='closest'
    )
    return fig