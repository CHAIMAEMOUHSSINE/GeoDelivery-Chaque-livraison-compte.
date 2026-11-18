package com.geodelivery.optimization;

import java.util.*;

public final class NearestNeighborAlgorithm {
    private NearestNeighborAlgorithm() {}
    public static List<Integer> solve(double[][] d,boolean returnToDepot) {
        if(d.length==0) throw new IllegalArgumentException("Dépôt manquant");
        List<Integer> route=new ArrayList<>(); route.add(0);
        boolean[] visited=new boolean[d.length]; visited[0]=true; int current=0;
        for(int n=1;n<d.length;n++) {
            int next=-1;
            for(int j=1;j<d.length;j++)
                if(!visited[j] && (next<0 || d[current][j]<d[current][next])) next=j;
            visited[next]=true; route.add(next); current=next;
        }
        if(returnToDepot) route.add(0);
        return route;
    }
    public static double distance(List<Integer> route,double[][] d) {
        double total=0;
        for(int i=1;i<route.size();i++) total+=d[route.get(i-1)][route.get(i)];
        return total;
    }
}
